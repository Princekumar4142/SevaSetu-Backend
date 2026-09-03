const mongoose = require("mongoose");
const crypto = require("crypto");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    purpose: { type: String, enum: ["REGISTER"], default: "REGISTER" },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// MongoDB TTL index — the document is automatically deleted once expiresAt
// passes, so expired OTPs don't need manual cleanup.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.statics.hashOtp = function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

module.exports = mongoose.model("Otp", otpSchema);
