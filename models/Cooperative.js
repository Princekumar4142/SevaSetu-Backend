const mongoose = require("mongoose");

const cooperativeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    federation: { type: mongoose.Schema.Types.ObjectId, ref: "Federation", default: null },
    address: { type: String, trim: true },
    zone: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "PENDING", "SUSPENDED"], default: "PENDING" },
    welfareFundBalance: { type: Number, default: 0 },
    revenueSplit: {
      workerShare: { type: Number, default: 0.75 },
      cooperativeShare: { type: Number, default: 0.15 },
      welfareShare: { type: Number, default: 0.05 },
      platformShare: { type: Number, default: 0.05 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cooperative", cooperativeSchema);
