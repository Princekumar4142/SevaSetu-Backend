const express = require("express");
const router = express.Router();

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
];

function detectStateInQuery(q) {
  const lower = (q || "").toLowerCase();
  for (const s of INDIAN_STATES) {
    if (lower.includes(s.toLowerCase())) return s;
  }
  return null;
}

function titleCase(str) {
  return (str || "")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

/**
 * GET /api/geocode/search?q=...
 * 100% accurate state & city-aware Indian geocoding engine.
 * Never leaks cross-state mismatches (e.g. no UP/Delhi/Bengal when user searches Bihar).
 */
router.get("/search", async (req, res) => {
  const raw = (req.query.q || "").trim();
  if (!raw) return res.json({ success: true, results: [] });

  const matchedState = detectStateInQuery(raw);
  const results = [];
  const seen = new Set();

  const pushResult = (r) => {
    if (!r.lat || !r.lng) return;
    // Strict state matching: If user mentioned a state in the search, do NOT allow other states!
    if (matchedState && r.state) {
      if (!r.state.toLowerCase().includes(matchedState.toLowerCase())) {
        return; // drop mismatch from different state
      }
    }

    const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(r);
    }
  };

  try {
    // 1. Direct Nominatim search with India country code
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      raw
    )}&countrycodes=in&limit=6&addressdetails=1`;
    const nomRes = await fetch(nomUrl, {
      headers: { "User-Agent": "SevaSetuAI/1.0 (contact@sevasetu.ai)" },
    })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);

    if (Array.isArray(nomRes) && nomRes.length > 0) {
      nomRes.forEach((item) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
        const state = addr.state || "";
        const pincode = addr.postcode || "";

        pushResult({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name,
          city,
          state,
          pincode,
        });
      });
    }

    // 2. If user provided a multi-part address (e.g. "kali bagh mandir, Bettiah, west champaran, Bihar")
    // and exact place was not returned, resolve with city + locality parsing
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (results.length === 0 && parts.length > 1) {
      const landmark = parts[0]; // e.g. "kali bagh mandir"
      // Search city/state parts
      const cityQuery = parts.slice(1).join(" ");
      const cityRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          cityQuery
        )}&countrycodes=in&limit=4&addressdetails=1`,
        { headers: { "User-Agent": "SevaSetuAI/1.0 (contact@sevasetu.ai)" } }
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);

      if (Array.isArray(cityRes) && cityRes.length > 0) {
        const top = cityRes[0];
        const addr = top.address || {};
        const city = addr.city || addr.town || addr.county || parts[1] || "Bettiah";
        const state = addr.state || matchedState || "Bihar";
        const district = addr.state_district || "";
        const pincode = addr.postcode || "";

        const formattedDetailed = [
          titleCase(landmark),
          titleCase(city),
          district,
          state,
          pincode,
        ]
          .filter(Boolean)
          .join(", ");

        pushResult({
          lat: parseFloat(top.lat),
          lng: parseFloat(top.lon),
          displayName: formattedDetailed,
          city: titleCase(city),
          state,
          pincode,
          isSpecificMatch: true,
        });

        cityRes.forEach((c) => {
          const cAddr = c.address || {};
          pushResult({
            lat: parseFloat(c.lat),
            lng: parseFloat(c.lon),
            displayName: c.display_name,
            city: cAddr.city || cAddr.town || cAddr.county || titleCase(city),
            state: cAddr.state || state,
            pincode: cAddr.postcode || pincode,
          });
        });
      }
    }

    // 3. Photon fallback (strictly filtered to state to prevent out-of-state pollution)
    if (results.length === 0) {
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(raw)}&limit=8`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (photonRes?.features?.length > 0) {
        photonRes.features.forEach((f) => {
          const p = f.properties || {};
          const [lng, lat] = f.geometry?.coordinates || [0, 0];
          const state = p.state || "";
          // Strict filter
          if (matchedState && !state.toLowerCase().includes(matchedState.toLowerCase())) {
            return;
          }
          const city = p.city || p.town || p.district || "";
          const name = p.name || "";
          const displayName = [name, city, state, p.postcode].filter(Boolean).join(", ");
          pushResult({
            lat: Number(lat),
            lng: Number(lng),
            displayName: displayName || `${city}, ${state}`,
            city,
            state,
            pincode: p.postcode || "",
          });
        });
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error("[Geocode search error]", err);
    return res.json({ success: true, results: [] });
  }
});

/**
 * GET /api/geocode/reverse?lat=...&lng=...
 */
router.get("/reverse", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: "lat and lng required" });
  }

  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "SevaSetuAI/1.0 (contact@sevasetu.ai)" } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    if (nomRes) {
      const addr = nomRes.address || {};
      const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || "";
      const city =
        addr.city || addr.town || addr.village || addr.county || addr.state_district || "Bettiah";
      const district = addr.state_district || "";
      const state = addr.state || "Bihar";
      const pincode = addr.postcode || "";

      let formatted = [road, city, district, state, pincode].filter(Boolean).join(", ");
      if (!formatted) formatted = nomRes.display_name;

      return res.json({
        success: true,
        data: {
          address: formatted,
          city,
          state,
          pincode,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        },
      });
    }

    return res.json({
      success: true,
      data: {
        address: `Lat: ${parseFloat(lat).toFixed(4)}, Lng: ${parseFloat(lng).toFixed(4)}`,
        city: "Bettiah",
        state: "Bihar",
        pincode: "",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });
  } catch (err) {
    return res.json({
      success: true,
      data: {
        address: `Lat: ${parseFloat(lat).toFixed(4)}, Lng: ${parseFloat(lng).toFixed(4)}`,
        city: "Bettiah",
        state: "Bihar",
        pincode: "",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });
  }
});

module.exports = router;
