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

module.exports = { getProfile, updateProfile };
