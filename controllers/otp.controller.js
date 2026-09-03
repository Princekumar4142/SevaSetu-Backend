const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const otpService = require("../services/otp.service");

const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await otpService.requestOtp({ email, purpose: "REGISTER" });
  return ApiResponse.success(res, {
    message: `Verification code sent to ${email}`,
    data: result, // { expiresInMinutes, devOtp? } — devOtp only present when SMTP isn't configured
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  await otpService.verifyOtp({ email, otp, purpose: "REGISTER" });
  return ApiResponse.success(res, { message: "Email verified" });
});

module.exports = { sendOtp, verifyOtp };
