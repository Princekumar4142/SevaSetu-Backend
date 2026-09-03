const Razorpay = require("razorpay");
const crypto = require("crypto");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const isConfigured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

let razorpayInstance = null;
if (isConfigured) {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[RAZORPAY] Razorpay credentials missing from .env (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET). " +
    "Online payments will run in sandbox demo mode."
  );
}

/**
 * Verify Razorpay payment signature
 */
function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!isConfigured) {
    return true; // Demo fallback
  }

  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
}

module.exports = {
  razorpayInstance,
  isRazorpayConfigured: isConfigured,
  razorpayKeyId: RAZORPAY_KEY_ID || "rzp_test_sevasetu_demo",
  verifyRazorpaySignature,
};
