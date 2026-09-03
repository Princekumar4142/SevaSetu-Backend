const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const cooperativeService = require("../services/cooperative.service");

const getProfile = asyncHandler(async (req, res) => {
  const data = await cooperativeService.getProfile(req.user.cooperative);
  return ApiResponse.success(res, { message: "Cooperative profile fetched", data });
});

module.exports = { getProfile };
