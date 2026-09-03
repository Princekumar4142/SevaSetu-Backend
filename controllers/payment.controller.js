const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const {
  razorpayInstance,
  razorpayKeyId,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} = require("../config/razorpay");

/**
 * GET /api/payments/key
 * Returns Razorpay public key ID for frontend checkout popup
 */
const getRazorpayKey = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, {
    message: "Razorpay key fetched",
    data: { keyId: razorpayKeyId },
  });
});

/**
 * POST /api/payments/create-order
 * Creates an official Razorpay Order ID
 */
const createOrder = asyncHandler(async (req, res) => {
  const { amount, receipt, notes } = req.body;

  if (!amount || amount <= 0) {
    throw ApiError.badRequest("Valid payment amount is required");
  }

  const amountInPaise = Math.round(Number(amount) * 100);

  if (isRazorpayConfigured && razorpayInstance) {
    try {
      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || { platform: "SevaSetu AI" },
      };

      const order = await razorpayInstance.orders.create(options);

      return ApiResponse.success(res, {
        message: "Razorpay order created",
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: razorpayKeyId,
        },
        statusCode: 201,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[RAZORPAY ERROR]", err);
      throw ApiError.badRequest(err.error?.description || err.message || "Failed to create Razorpay order");
    }
  }

  // Fallback demo order ID for development
  const demoOrderId = `order_${Date.now()}`;
  return ApiResponse.success(res, {
    message: "Demo Razorpay order created",
    data: {
      orderId: demoOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: razorpayKeyId,
      isDemo: true,
    },
    statusCode: 201,
  });
});

/**
 * POST /api/payments/verify-payment
 * Verifies Razorpay payment signature
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id) {
    throw ApiError.badRequest("Order ID and Payment ID are required");
  }

  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    throw ApiError.badRequest("Payment signature verification failed. Possible tampering detected.");
  }

  return ApiResponse.success(res, {
    message: "Payment verified successfully",
    data: {
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    },
  });
});

module.exports = {
  getRazorpayKey,
  createOrder,
  verifyPayment,
};
