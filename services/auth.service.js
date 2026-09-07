const User = require("../models/User");
const Worker = require("../models/Worker");
const Otp = require("../models/Otp");
const ApiError = require("../utils/apiError");
const { generateToken } = require("../utils/token");
const { ROLES } = require("../utils/roles");
const otpService = require("./otp.service");
const { sendWelcomeEmail } = require("./email.service");


async function assertNoDuplicate({ phone, email }) {
  const existing = await User.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
  if (existing) {
    if (existing.phone === phone) throw ApiError.conflict("An account with this phone number already exists");
    throw ApiError.conflict("An account with this email already exists");
  }
}

function issueSession(user) {
  const token = generateToken({ id: user._id.toString(), role: user.role });
  return { token, user: user.toSafeObject() };
}

async function registerCustomer({ name, phone, email, password, address, city, state, pincode }) {
  await assertNoDuplicate({ phone, email });
  // Requires a prior successful POST /auth/verify-otp for this email —
  // throws if there's no verified, unconsumed OTP record.
  await otpService.consumeVerifiedOtp({ email, purpose: "REGISTER" });
  const user = await User.create({
    name,
    phone,
    email,
    passwordHash: password,
    role: ROLES.CUSTOMER,
    isVerified: true,
    address: address || "",
    city: city || "",
    state: state || "",
    pincode: pincode || "",
  });

  if (email) {
    sendWelcomeEmail(email, name).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[AUTH] Welcome email dispatch failed:", err?.message || err);
    });
  }

  return issueSession(user);
}

async function registerWorker({
  name,
  phone,
  email,
  password,
  address,
  city,
  state,
  pincode,
  skills,
  serviceCategory,
  experienceYears,
  hourlyRate,
  aadharNumber,
  aadharImage,
  hasShop,
  shopName,
  shopImage,
  shopAddress,
  location,
  profilePhoto,
}) {
  await assertNoDuplicate({ phone, email });
  await otpService.consumeVerifiedOtp({ email, purpose: "REGISTER" });
  const user = await User.create({
    name,
    phone,
    email,
    passwordHash: password,
    role: ROLES.WORKER,
    isVerified: false,
    profilePhoto: profilePhoto || null,
  });

  const worker = await Worker.create({
    user: user._id,
    address,
    city: city || "Pune",
    state: state || "Maharashtra",
    pincode: pincode || "411014",
    skills: skills && skills.length > 0 ? skills : ["General Professional Service"],
    serviceCategory: serviceCategory || "custom-services",
    experienceYears: Number(experienceYears) || 0,
    hourlyRate: Number(hourlyRate) || 299,
    aadharNumber: aadharNumber || "",
    aadharImage: aadharImage || "",
    hasShop: Boolean(hasShop),
    shopName: shopName || "",
    shopImage: shopImage || "",
    shopAddress: shopAddress || address || "",
    location: location || { lat: 18.5793, lng: 73.9787, address: address || "" },
    verificationStatus: "PENDING",
    verifiedAt: null,
    status: "OFFLINE",
  });

  if (email) {
    sendWelcomeEmail(email, name).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[AUTH] Worker welcome email dispatch failed:", err?.message || err);
    });
  }

  const session = issueSession(user);
  return { ...session, worker };
}

async function login({ identifier, password }) {
  const isEmail = identifier.includes("@");
  const user = await User.findOne(isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }).select("+passwordHash");
  if (!user) throw ApiError.unauthorized("Invalid credentials");
  if (!user.isActive) throw ApiError.forbidden("This account has been deactivated. Contact your cooperative admin.");

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized("Invalid credentials");

  return issueSession(user);
}

async function requestPasswordResetOtp({ email }) {
  return otpService.requestOtp({ email, purpose: "RESET_PASSWORD" });
}

async function verifyPasswordResetOtp({ email, otp }) {
  return otpService.verifyOtp({ email, otp, purpose: "RESET_PASSWORD" });
}

async function resetPassword({ email, otp, newPassword }) {
  const cleanEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) throw ApiError.notFound("No account found registered with this email address");

  // Check if an unverified OTP record exists (if user skipped step 2 or verifies inline)
  const unverified = await Otp.findOne({ email: cleanEmail, purpose: "RESET_PASSWORD", verified: false }).sort({ createdAt: -1 });
  if (unverified) {
    if (!otp) throw ApiError.badRequest("Verification code is required");
    await otpService.verifyOtp({ email: cleanEmail, otp, purpose: "RESET_PASSWORD" });
  }

  // Consume the verified OTP record
  await otpService.consumeVerifiedOtp({ email: cleanEmail, purpose: "RESET_PASSWORD" });

  user.passwordHash = newPassword;
  await user.save();

  return { message: "Password updated successfully! You can now log in with your new password." };
}


module.exports = {
  registerCustomer,
  registerWorker,
  login,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
};

