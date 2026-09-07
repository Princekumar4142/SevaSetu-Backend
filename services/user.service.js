const User = require("../models/User");
const ApiError = require("../utils/apiError");

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user.toSafeObject();
}

const UPDATABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "profilePhoto",
  "language",
  "address",
  "city",
  "state",
  "pincode",
];

async function updateProfile(userId, updates) {
  const payload = {};
  for (const field of UPDATABLE_FIELDS) {
    if (updates[field] !== undefined) payload[field] = updates[field];
  }

  // Check email uniqueness if email changed
  if (payload.email) {
    const cleanEmail = payload.email.trim().toLowerCase();
    const existingEmail = await User.findOne({
      email: cleanEmail,
      _id: { $ne: userId },
    });
    if (existingEmail) {
      throw ApiError.conflict("This email address is already in use by another account");
    }
    payload.email = cleanEmail;
  }

  // Check phone uniqueness if phone changed
  if (payload.phone) {
    const cleanPhone = payload.phone.trim();
    const existingPhone = await User.findOne({
      phone: cleanPhone,
      _id: { $ne: userId },
    });
    if (existingPhone) {
      throw ApiError.conflict("This phone number is already registered with another account");
    }
    payload.phone = cleanPhone;
  }

  const user = await User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });
  if (!user) throw ApiError.notFound("User not found");
  return user.toSafeObject();
}

async function listUsers({ search = "", role = "ALL", limit = 100 } = {}) {
  const query = {};
  if (role && role !== "ALL") {
    query.role = role;
  }
  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { name: new RegExp(term, "i") },
      { email: new RegExp(term, "i") },
      { phone: new RegExp(term, "i") },
    ];
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  const Booking = require("../models/Booking");
  const userIds = users.map((u) => u._id);
  const bookingCounts = await Booking.aggregate([
    { $match: { customer: { $in: userIds } } },
    { $group: { _id: "$customer", count: { $sum: 1 } } },
  ]);
  const bookingMap = new Map(bookingCounts.map((b) => [b._id.toString(), b.count]));

  return users.map((u) => {
    delete u.passwordHash;
    delete u.__v;
    return {
      ...u,
      id: u._id.toString(),
      bookingsCount: bookingMap.get(u._id.toString()) || 0,
      joined: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "Recent",
      status: u.isActive === false ? "SUSPENDED" : "ACTIVE",
    };
  });
}

async function deleteUser(targetUserId, adminUser) {
  if (targetUserId.toString() === adminUser._id.toString()) {
    throw ApiError.badRequest("You cannot delete your own admin account");
  }

  const user = await User.findById(targetUserId);
  if (!user) throw ApiError.notFound("User profile not found");

  // Prevent deleting another platform admin if not super admin
  if (user.role === "PLATFORM_ADMIN" && adminUser.role !== "PLATFORM_ADMIN") {
    throw ApiError.forbidden("Permission denied: Cannot delete a platform admin account");
  }

  const Worker = require("../models/Worker");
  const Booking = require("../models/Booking");

  // If user is a worker or has a linked worker document, remove worker profile
  const workers = await Worker.find({ user: targetUserId });
  if (workers.length > 0) {
    const workerIds = workers.map((w) => w._id);
    await Worker.deleteMany({ user: targetUserId });

    // Cancel pending/assigned bookings linked to this worker
    await Booking.updateMany(
      { worker: { $in: workerIds }, status: { $in: ["PENDING", "ACCEPTED", "ASSIGNED"] } },
      { $set: { status: "CANCELLED", cancellationReason: "Worker profile removed by administrator" } }
    );
  }

  // Cancel pending/active bookings where this user was the customer
  await Booking.updateMany(
    { customer: targetUserId, status: { $in: ["PENDING", "ACCEPTED", "ASSIGNED"] } },
    { $set: { status: "CANCELLED", cancellationReason: "Customer account deleted by administrator" } }
  );

  // Delete the user from database
  await User.findByIdAndDelete(targetUserId);

  return { message: `User ${user.name} and all associated data have been permanently deleted` };
}

async function toggleUserStatus(targetUserId, adminUser, isActive) {
  if (targetUserId.toString() === adminUser._id.toString()) {
    throw ApiError.badRequest("You cannot suspend your own admin account");
  }

  const user = await User.findById(targetUserId);
  if (!user) throw ApiError.notFound("User not found");

  const newStatus = typeof isActive === "boolean" ? isActive : !user.isActive;
  user.isActive = newStatus;
  await user.save();

  return {
    user: user.toSafeObject(),
    status: user.isActive ? "ACTIVE" : "SUSPENDED",
    message: `Account for ${user.name} is now ${user.isActive ? "ACTIVE" : "SUSPENDED"}`,
  };
}

module.exports = { getProfile, updateProfile, listUsers, deleteUser, toggleUserStatus };

