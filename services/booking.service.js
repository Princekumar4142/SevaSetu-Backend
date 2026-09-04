const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Worker = require("../models/Worker");
const ApiError = require("../utils/apiError");

/**
 * Find verified workers matching city and service category for dispatch.
 * Returns an array of worker docs (populated with user) sorted: AVAILABLE first.
 */
async function getMatchedWorkersForDispatch({ city, category, preferredWorkerId } = {}) {
  const query = { verificationStatus: "VERIFIED" };

  // City match (case-insensitive)
  if (city && city.trim()) {
    query.city = new RegExp(city.trim(), "i");
  }

  // Category / skill match
  if (category && category !== "custom-services") {
    const cleanCat = category.replace(/-/g, " ");
    query.$or = [
      { serviceCategory: category },
      { serviceCategory: new RegExp(cleanCat, "i") },
      { skills: new RegExp(cleanCat, "i") },
    ];
  }

  const workers = await Worker.find(query)
    .populate("user", "name phone profilePhoto role")
    .sort({ status: 1, rating: -1 }); // AVAILABLE sorts before BUSY alphabetically

  const onlyVerifiedWorkers = workers.filter(
    (w) => w.user && w.user.role === "WORKER" && w.verificationStatus === "VERIFIED"
  );

  // Sort: AVAILABLE first, then preferred worker at top
  const sorted = [
    ...onlyVerifiedWorkers.filter((w) => w.status === "AVAILABLE"),
    ...onlyVerifiedWorkers.filter((w) => w.status !== "AVAILABLE"),
  ];

  // If customer preferred a specific worker, move them to front
  if (preferredWorkerId) {
    const prefIdx = sorted.findIndex(
      (w) => w._id.toString() === preferredWorkerId.toString()
    );
    if (prefIdx > -1) {
      const [pref] = sorted.splice(prefIdx, 1);
      sorted.unshift(pref);
    }
  }

  return sorted;
}

async function createBooking(customerId, bookingData) {
  const { items, address, slot, pricing, customerNotes, preferredWorkerId, category } = bookingData;

  if (!items || items.length === 0) {
    throw ApiError.badRequest("Booking must contain at least one item");
  }
  if (!address || !address.line1) {
    throw ApiError.badRequest("Valid service address is required");
  }
  if (!slot || !slot.date || !slot.time) {
    throw ApiError.badRequest("Valid booking slot date and time are required");
  }

  // Derive category from items if not explicitly passed
  const serviceCategory = category || items[0]?.meta || "custom-services";
  const city = address?.city || "";

  // Get city + category matched workers (preferred worker first if set)
  const matchedWorkers = await getMatchedWorkersForDispatch({
    city,
    category: serviceCategory,
    preferredWorkerId,
  });

  const booking = await Booking.create({
    customer: customerId,
    worker: null,
    cooperative: null,
    items,
    address,
    slot,
    pricing: {
      subtotal: pricing?.subtotal || items.reduce((sum, i) => sum + (i.price * (i.qty || 1)), 0),
      discount: pricing?.discount || 0,
      tax: pricing?.tax || 0,
      totalAmount: pricing?.totalAmount || (pricing?.subtotal || 0) - (pricing?.discount || 0),
      paymentMethod: pricing?.paymentMethod || "ONLINE",
      paymentStatus: "PAID",
    },
    status: "PENDING",
    statusHistory: [
      {
        status: "PENDING",
        note: "Booking placed by customer — waiting for worker partner acceptance",
        timestamp: new Date(),
      },
    ],
    customerNotes: customerNotes || "",
  });

  const populated = await Booking.findById(booking._id)
    .populate("customer", "name phone email")
    .populate({
      path: "worker",
      populate: { path: "user", select: "name phone profilePhoto rating" },
    });

  // Return both booking and matched worker IDs so the controller can do targeted socket dispatch
  return {
    booking: populated,
    matchedWorkerIds: matchedWorkers.map((w) => w._id.toString()),
  };
}

async function getCustomerBookings(customerId, status) {
  const query = { customer: customerId };
  if (status && status !== "ALL") {
    query.status = status;
  }
  return Booking.find(query)
    .populate({
      path: "worker",
      populate: { path: "user", select: "name phone profilePhoto" },
    })
    .sort({ createdAt: -1 });
}

async function getWorkerBookings(userId, status) {
  const worker = await Worker.findOne({ user: userId });
  if (!worker) throw ApiError.notFound("Worker profile not found");

  const query = {
    $or: [
      { worker: worker._id },
      { status: "PENDING" }, // Open unassigned pool
    ],
  };

  if (status && status !== "ALL") {
    query.status = status;
  }

  return Booking.find(query)
    .populate("customer", "name phone email")
    .sort({ createdAt: -1 });
}

async function updateBookingStatus(bookingId, status, user) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound("Booking not found");

  // Worker claiming a pending booking
  if (user.role === "WORKER") {
    const worker = await Worker.findOne({ user: user._id });
    if (!worker) throw ApiError.forbidden("Worker profile required");
    
    if (booking.status === "PENDING" && status === "ASSIGNED") {
      booking.worker = worker._id;
      booking.cooperative = worker.cooperative;
    } else if (booking.worker && booking.worker.toString() !== worker._id.toString()) {
      throw ApiError.forbidden("You are not assigned to this booking");
    }
  }

  booking.status = status;
  booking.statusHistory.push({
    status,
    note: `Status updated to ${status} by ${user.name || user.role}`,
    timestamp: new Date(),
  });

  await booking.save();

  return Booking.findById(bookingId)
    .populate("customer", "name phone email")
    .populate({
      path: "worker",
      populate: { path: "user", select: "name phone profilePhoto" },
    });
}

async function getCooperativeBookings(cooperativeId) {
  const query = {};
  if (cooperativeId) query.cooperative = cooperativeId;
  return Booking.find(query)
    .populate("customer", "name phone email")
    .populate({
      path: "worker",
      populate: { path: "user", select: "name phone profilePhoto" },
    })
    .sort({ createdAt: -1 });
}

async function getAllBookings() {
  return Booking.find()
    .populate("customer", "name phone email")
    .populate({
      path: "worker",
      populate: { path: "user", select: "name phone profilePhoto" },
    })
    .populate("cooperative", "name zone")
    .sort({ createdAt: -1 });
}

async function getBookingById(bookingId) {
  const isObjectId = mongoose.Types.ObjectId.isValid(bookingId);
  const query = isObjectId ? { $or: [{ _id: bookingId }, { bookingNumber: bookingId }] } : { bookingNumber: bookingId };
  
  const booking = await Booking.findOne(query)
    .populate("customer", "name phone email")
    .populate({
      path: "worker",
      populate: { path: "user", select: "name phone profilePhoto rating" },
    })
    .populate("cooperative", "name zone");
  if (!booking) throw ApiError.notFound("Booking not found");
  return booking;
}

module.exports = {
  createBooking,
  getCustomerBookings,
  getWorkerBookings,
  updateBookingStatus,
  getCooperativeBookings,
  getAllBookings,
  getBookingById,
  getMatchedWorkersForDispatch,
};
