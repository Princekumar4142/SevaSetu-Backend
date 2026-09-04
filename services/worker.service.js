const Worker = require("../models/Worker");
const ApiError = require("../utils/apiError");

async function getProfileByUserId(userId) {
  const worker = await Worker.findOne({ user: userId }).populate("user", "name phone email profilePhoto isVerified");
  if (!worker) throw ApiError.notFound("Worker profile not found");
  return worker;
}

const UPDATABLE_FIELDS = [
  "address",
  "city",
  "state",
  "pincode",
  "skills",
  "serviceCategory",
  "hourlyRate",
  "experienceYears",
  "bio",
  "status",
  "profilePhoto",
  "hasShop",
  "shopName",
  "shopAddress",
];

async function updateProfile(userId, updates) {
  const payload = {};
  for (const field of UPDATABLE_FIELDS) {
    if (updates[field] !== undefined) payload[field] = updates[field];
  }
  const worker = await Worker.findOneAndUpdate({ user: userId }, payload, { new: true, runValidators: true })
    .populate("user", "name phone email profilePhoto isVerified");
  if (!worker) throw ApiError.notFound("Worker profile not found");
  return worker;
}

async function listForAdmin({ cooperativeId = null, status = "PENDING" } = {}) {
  const query = { verificationStatus: status };
  if (cooperativeId) query.cooperative = cooperativeId;
  return Worker.find(query)
    .populate("user", "name phone email profilePhoto isVerified createdAt")
    .populate("cooperative", "name zone status")
    .sort({ createdAt: -1 });
}

async function getForAdmin(workerId, cooperativeId = null) {
  const query = { _id: workerId };
  if (cooperativeId) query.cooperative = cooperativeId;
  const worker = await Worker.findOne(query)
    .populate("user", "name phone email profilePhoto isVerified createdAt")
    .populate("cooperative", "name zone status");
  if (!worker) throw ApiError.notFound("Worker not found or outside your cooperative");
  return worker;
}

async function verifyWorker(workerId, adminUser, decision, rejectionReason = "") {
  const query = { _id: workerId };
  if (adminUser.role === "COOPERATIVE_ADMIN") {
    if (!adminUser.cooperative) throw ApiError.forbidden("Your admin account is not linked to a cooperative");
    query.cooperative = adminUser.cooperative;
  }

  const worker = await Worker.findOne(query).populate("user", "name phone email profilePhoto isVerified");
  if (!worker) throw ApiError.notFound("Worker not found or outside your cooperative");
  if (worker.verificationStatus === "VERIFIED" && decision === "VERIFY") {
    return worker;
  }

  if (decision === "VERIFY") {
    worker.verificationStatus = "VERIFIED";
    worker.rejectionReason = null;
    worker.verifiedAt = new Date();
    worker.verifiedBy = adminUser._id;
    await worker.save();
    await worker.user.updateOne({ isVerified: true });
  } else {
    worker.verificationStatus = "REJECTED";
    worker.rejectionReason = rejectionReason || "Please review your profile and submitted details.";
    worker.verifiedAt = null;
    worker.verifiedBy = adminUser._id;
    await worker.save();
    await worker.user.updateOne({ isVerified: false });
  }

  return Worker.findById(worker._id)
    .populate("user", "name phone email profilePhoto isVerified")
    .populate("cooperative", "name zone status");
}

async function listVerified({ search = "", skill = "", category = "", city = "" } = {}) {
  const query = { verificationStatus: "VERIFIED" };
  if (category && category !== "all") {
    const cleanCat = category.replace(/-/g, " ");
    query.$or = [
      { serviceCategory: category },
      { serviceCategory: new RegExp(cleanCat, "i") },
      { skills: new RegExp(cleanCat, "i") },
    ];
  } else if (skill) {
    query.skills = skill;
  }
  if (city) query.city = new RegExp(city.trim(), "i");
  const workers = await Worker.find(query)
    .populate("user", "name phone profilePhoto role isVerified")
    .populate("cooperative", "name zone")
    .sort({ rating: -1, totalJobs: -1 });

  // STRICT PROTECTION: Only return records where the linked user is an actual WORKER
  const onlySkilledWorkers = workers.filter(
    (w) => w.user && w.user.role === "WORKER" && w.verificationStatus === "VERIFIED"
  );

  if (!search.trim()) return onlySkilledWorkers;
  const term = search.trim().toLowerCase();
  return onlySkilledWorkers.filter((w) =>
    [w.user?.name, w.shopName, w.city, w.bio, w.serviceCategory, ...(w.skills || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
}

async function getVerifiedById(workerId) {
  const worker = await Worker.findOne({ _id: workerId, verificationStatus: "VERIFIED" })
    .populate("user", "name profilePhoto")
    .populate("cooperative", "name");
  if (!worker) throw ApiError.notFound("Verified worker not found");
  return worker;
}

module.exports = { getProfileByUserId, updateProfile, listForAdmin, getForAdmin, verifyWorker, listVerified, getVerifiedById };
