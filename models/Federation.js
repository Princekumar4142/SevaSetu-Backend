const mongoose = require("mongoose");

const federationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Federation", federationSchema);
