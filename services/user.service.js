const User = require("../models/User");
const ApiError = require("../utils/apiError");

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user.toSafeObject();
}

const UPDATABLE_FIELDS = ["name", "email", "profilePhoto", "language"];

async function updateProfile(userId, updates) {
  const payload = {};
  for (const field of UPDATABLE_FIELDS) {
    if (updates[field] !== undefined) payload[field] = updates[field];
  }
  const user = await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound("User not found");
  return user.toSafeObject();
}

module.exports = { getProfile, updateProfile };
