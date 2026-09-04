const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ALL_ROLES, ROLES } = require("../utils/roles");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // allows multiple docs with no email while keeping uniqueness when present
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    passwordHash: { type: String, required: true, select: false },
    profilePhoto: { type: String, default: null },
    role: { type: String, enum: ALL_ROLES, required: true, default: ROLES.CUSTOMER },
    isVerified: { type: Boolean, default: false }, // used for worker verification-by-cooperative flow
    isActive: { type: Boolean, default: true },
    language: { type: String, enum: ["EN", "HI"], default: "HI" },

    // Customer / User primary address details
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },

    // Present only for role === COOPERATIVE_ADMIN / FEDERATION_ADMIN, kept here to avoid
    // an extra join for the common "which org does this admin belong to" check.
    cooperative: { type: mongoose.Schema.Types.ObjectId, ref: "Cooperative", default: null },
    federation: { type: mongoose.Schema.Types.ObjectId, ref: "Federation", default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  // Async Mongoose middleware signals completion by returning (its promise
  // resolving) — it must NOT take/call a `next` callback. Mongoose only
  // passes `next` to legacy callback-style (non-async) middleware; for an
  // async function, `next` is simply never provided, so calling it throws
  // "next is not a function". This was a real, reproducible bug: OTP
  // verification worked fine (doesn't touch this model), but User.create()
  // during registration crashed with a 500 every time.
  if (!this.isModified("passwordHash")) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.methods.comparePassword = function comparePassword(plainText) {
  return bcrypt.compare(plainText, this.passwordHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
