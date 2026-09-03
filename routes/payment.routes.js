const express = require("express");
const {
  getRazorpayKey,
  createOrder,
  verifyPayment,
} = require("../controllers/payment.controller");

const router = express.Router();

router.get("/key", getRazorpayKey);
router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);

module.exports = router;
