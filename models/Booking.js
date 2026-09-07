const mongoose = require("mongoose");

const bookingItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, default: 1, min: 1 },
  durationMins: { type: Number, default: 0 },
  icon: { type: String, default: "spa" },
  meta: { type: String, default: "" },
  originalPrice: { type: Number, default: null },
  includes: [{ label: String, price: Number }],
});

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      default: () => "BK-" + Math.floor(100000 + Math.random() * 900000),
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      default: null,
    },
    cooperative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cooperative",
      default: null,
    },
    items: [bookingItemSchema],
    address: {
      label: { type: String, default: "Home" },
      line1: { type: String, required: true },
      landmark: { type: String, default: "" },
      city: { type: String, default: "Mumbai" },
      pincode: { type: String, default: "400001" },
      lat: { type: Number, default: 19.076 },
      lng: { type: Number, default: 72.8777 },
    },
    slot: {
      date: { type: String, required: true },
      time: { type: String, required: true },
    },
    pricing: {
      subtotal: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      paymentMethod: { type: String, enum: ["COD", "ONLINE", "UPI", "WALLET"], default: "ONLINE" },
      paymentStatus: { type: String, enum: ["PENDING", "PAID", "REFUNDED"], default: "PAID" },
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
    workerLiveLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    customerNotes: { type: String, default: "" },
    cancellationReason: { type: String, default: null },
    rating: {
      score: { type: Number, min: 1, max: 5, default: null },
      review: { type: String, default: "" },
      createdAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ worker: 1, status: 1 });
bookingSchema.index({ cooperative: 1, status: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
