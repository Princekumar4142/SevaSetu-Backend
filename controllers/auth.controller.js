const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const authService = require("../services/auth.service");

const registerCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, password, address, city, state, pincode } = req.body;
  const result = await authService.registerCustomer({ name, phone, email, password, address, city, state, pincode });
  return ApiResponse.success(res, { message: "Customer registered successfully", data: result, statusCode: 201 });
});

const registerWorker = asyncHandler(async (req, res) => {
  const result = await authService.registerWorker(req.body);
  return ApiResponse.success(res, {
    message: "Worker registered successfully — verification pending from your cooperative",
    data: result,
    statusCode: 201,
  });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const result = await authService.login({ identifier, password });
  return ApiResponse.success(res, { message: "Login successful", data: result });
});

// Logout is stateless with JWT (no server-side session to destroy); this endpoint exists
// for a consistent API contract and so the client can clear its stored token via one call.
const logout = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, { message: "Logged out successfully" });
});

const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, { message: "Current user fetched", data: { user: req.user.toSafeObject() } });
});

module.exports = { registerCustomer, registerWorker, login, logout, getMe };
