const express = require("express");
const authController = require("../controllers/auth.controller");
const otpController = require("../controllers/otp.controller");
const protect = require("../middleware/auth.middleware");
const authLimiter = require("../middleware/rateLimiter.middleware");
const {
  registerCustomerValidator,
  registerWorkerValidator,
  loginValidator,
  sendOtpValidator,
  verifyOtpValidator,
} = require("../validators/auth.validator");

const router = express.Router();

router.post("/send-otp", authLimiter, sendOtpValidator, otpController.sendOtp);
router.post("/verify-otp", authLimiter, verifyOtpValidator, otpController.verifyOtp);
router.post("/register/customer", authLimiter, registerCustomerValidator, authController.registerCustomer);
router.post("/register/worker", authLimiter, registerWorkerValidator, authController.registerWorker);
router.post("/login", authLimiter, loginValidator, authController.login);
router.post("/logout", protect, authController.logout);
router.get("/me", protect, authController.getMe);

module.exports = router;
