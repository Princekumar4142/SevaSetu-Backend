const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const userService = require("../services/user.service");

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  return ApiResponse.success(res, { message: "Profile fetched", data: { user } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  return ApiResponse.success(res, { message: "Profile updated", data: { user } });
});

module.exports = { getProfile, updateProfile };
