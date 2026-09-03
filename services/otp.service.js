const Otp = require("../models/Otp");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { sendOtpEmail } = require("./email.service");

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
// Once verified, extend the record's lifetime so the person has time to
// finish filling out the rest of the registration form (password, address,
// skills, etc.) without the "verified" proof silently expiring via the TTL
// index. This was a real bug: the original 10-minute window applied even
// after successful verification, so a verified-but-slow registration would
// fail with "please verify your email" again — confusingly, since the UI
// still showed "Email verified ✓" the whole time.
const VERIFIED_GRACE_MINUTES = 45;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)).slice(0, OTP_LENGTH);
}

async function requestOtp({ email, purpose = "REGISTER" }) {
  if (purpose === "REGISTER") {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw ApiError.conflict("An account with this email already exists");
  }

  // Rate-limit resends per email so a user can't spam themselves/the mail server.
  const recent = await Otp.findOne({ email: email.toLowerCase(), purpose }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recent.createdAt.getTime())) / 1000);
    throw ApiError.badRequest(`Please wait ${waitSeconds}s before requesting another code`);
  }

  const otp = generateOtp();
  const otpHash = Otp.hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Remove any previous unverified codes for this email+purpose before issuing a new one.
  await Otp.deleteMany({ email: email.toLowerCase(), purpose, verified: false });
  await Otp.create({ email: email.toLowerCase(), otpHash, purpose, expiresAt });

  const emailResult = await sendOtpEmail(email, otp);

  return {
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    // Only surface the OTP in the API response when email sending is in dev-mode
    // fallback (no SMTP configured) — otherwise a real email is the only place
    // it should appear. This keeps local development usable without secrets
    // while never leaking the code once real email delivery is configured.
    devOtp: emailResult.devMode ? otp : undefined,
  };
}

async function verifyOtp({ email, otp, purpose = "REGISTER" }) {
  const record = await Otp.findOne({ email: email.toLowerCase(), purpose, verified: false }).sort({ createdAt: -1 });
  if (!record) throw ApiError.badRequest("No pending verification code for this email — request a new one");

  if (record.expiresAt.getTime() < Date.now()) {
    await record.deleteOne();
    throw ApiError.badRequest("This code has expired — request a new one");
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await record.deleteOne();
    throw ApiError.badRequest("Too many incorrect attempts — request a new code");
  }

  if (Otp.hashOtp(otp) !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest(`Incorrect code (${MAX_VERIFY_ATTEMPTS - record.attempts} attempt(s) left)`);
  }

  record.verified = true;
  // Extend expiry now that it's verified — see VERIFIED_GRACE_MINUTES comment above.
  record.expiresAt = new Date(Date.now() + VERIFIED_GRACE_MINUTES * 60 * 1000);
  await record.save();
  return true;
}

/**
 * Used by the registration endpoints — confirms a given email has a
 * *verified* OTP record from the last few minutes, so registration can only
 * complete after a successful /send-otp + /verify-otp round trip (or the
 * combined flow where the OTP is verified inline as part of registration —
 * see auth.service.js).
 */
async function consumeVerifiedOtp({ email, purpose = "REGISTER" }) {
  const record = await Otp.findOne({ email: email.toLowerCase(), purpose, verified: true }).sort({ createdAt: -1 });
  if (!record) throw ApiError.badRequest("Please verify your email with the code sent to it before continuing");
  await record.deleteOne();
}

module.exports = { requestOtp, verifyOtp, consumeVerifiedOtp, OTP_EXPIRY_MINUTES };
