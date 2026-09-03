const express = require("express");
const rateLimit = require("express-rate-limit");
const { subscribe } = require("../controllers/subscriber.controller");

const router = express.Router();

// Rate-limit subscription to prevent abuse (max 5 per 15 minutes per IP)
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many subscription attempts. Please try again later." },
});

router.post("/", subscribeLimiter, subscribe);

module.exports = router;
