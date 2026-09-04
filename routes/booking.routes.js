const express = require("express");
const bookingController = require("../controllers/booking.controller");
const protect = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { ROLES } = require("../utils/roles");

const router = express.Router();

// Customer endpoints
router.post("/", protect, authorize(ROLES.CUSTOMER), bookingController.createBooking);
router.get("/my", protect, authorize(ROLES.CUSTOMER), bookingController.getCustomerBookings);

// Worker endpoints
router.get("/pending-alert", protect, bookingController.getPendingAlert);
router.get("/worker", protect, authorize(ROLES.WORKER), bookingController.getWorkerBookings);

// Status updates (Worker, Customer, Cooperative, Platform Admin)
router.patch("/:id/status", protect, bookingController.updateStatus);

// Cooperative Admin endpoints
router.get("/cooperative", protect, authorize(ROLES.COOPERATIVE_ADMIN), bookingController.getCooperativeBookings);

// Platform & Federation Admin endpoints
router.get("/all", protect, authorize(ROLES.PLATFORM_ADMIN, ROLES.FEDERATION_ADMIN), bookingController.getAllBookings);

// Booking Details
router.get("/:id", protect, bookingController.getBookingById);

module.exports = router;
