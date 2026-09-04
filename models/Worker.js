const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    cooperative: { type: mongoose.Schema.Types.ObjectId, ref: "Cooperative", default: null },

    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },

    skills: [{ type: String, trim: true }],
    serviceCategory: { type: String, trim: true, default: "custom-services" },
    experienceYears: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 299 },
    skillLevel: { type: String, enum: ["Level 1", "Level 2", "Level 3"], default: "Level 1" },
    bio: { type: String, trim: true, maxlength: 500 },

    // Mandatory Aadhaar Details
    aadharNumber: { type: String, trim: true },
    aadharImage: { type: String, default: "" },

    // Optional Shop / Business Details
    hasShop: { type: Boolean, default: false },
    shopName: { type: String, trim: true, default: "" },
    shopImage: { type: String, default: "" },
    shopAddress: { type: String, trim: true, default: "" },

    verificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    status: { type: String, enum: ["AVAILABLE", "BUSY", "OFFLINE"], default: "AVAILABLE" },
    rating: { type: Number, default: 4.9, min: 0, max: 5 },
    totalJobs: { type: Number, default: 12 },
    jobsThisWeek: { type: Number, default: 3 },

    location: {
      lat: { type: Number, default: 18.5793 },
      lng: { type: Number, default: 73.9787 },
      address: { type: String, default: "" },
    },

    earnings: {
      gross: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
      welfareContribution: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

workerSchema.index({ skills: 1 });
workerSchema.index({ cooperative: 1, verificationStatus: 1, createdAt: -1 });
workerSchema.index({ verificationStatus: 1, city: 1 });

module.exports = mongoose.model("Worker", workerSchema);
