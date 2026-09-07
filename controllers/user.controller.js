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

const listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers({
    search: req.query.search || "",
    role: req.query.role || "ALL",
    limit: req.query.limit || 100,
  });
  return ApiResponse.success(res, { message: "Users fetched", data: { users } });
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.userId, req.user);
  return ApiResponse.success(res, { message: result.message, data: result });
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const result = await userService.toggleUserStatus(req.params.userId, req.user, req.body.isActive);
  return ApiResponse.success(res, { message: result.message, data: result });
});

module.exports = { getProfile, updateProfile, listUsers, deleteUser, toggleUserStatus };

