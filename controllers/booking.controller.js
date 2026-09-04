const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const bookingService = require("../services/booking.service");

const socketServer = require("../socket");

const createBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.createBooking(req.user._id, req.body);
  const { booking, matchedWorkerIds } = result;

  try {
    const orderPayload = {
      orderId: booking._id,
      bookingNumber: booking.bookingNumber,
      items: booking.items,
      address: booking.address,
      slot: booking.slot,
      totalAmount: booking.pricing.totalAmount,
      category: req.body.category || booking.items[0]?.meta || "custom-services",
      customer: {
        name: req.user?.name || "Customer",
        phone: req.user?.phone || "+91 98000 00000",
        profilePhoto: req.user?.profilePhoto || "",
      },
      matchedWorkerIds,
    };

    const sent = socketServer.emitToMatchedWorkers(matchedWorkerIds, "incoming_order", orderPayload);

    // Fallback broadcast to all connected sockets if targeted emit didn't find matched online sockets
    if (!sent || sent === 0) {
      socketServer.getIo().emit("incoming_order", orderPayload);
    }
  } catch (err) {
    console.error("[Socket] Failed to dispatch incoming_order:", err.message);
  }

  return ApiResponse.created(res, { message: "Booking created successfully", data: { booking } });
});


const getCustomerBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getCustomerBookings(req.user._id, req.query.status);
  return ApiResponse.success(res, { message: "Customer bookings fetched", data: { bookings } });
});

const getWorkerBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getWorkerBookings(req.user._id, req.query.status);
  return ApiResponse.success(res, { message: "Worker bookings fetched", data: { bookings } });
});

const updateStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status, req.user);
  return ApiResponse.success(res, { message: `Booking status updated to ${req.body.status}`, data: { booking } });
});

const getCooperativeBookings = asyncHandler(async (req, res) => {
  const cooperativeId = req.user.role === "COOPERATIVE_ADMIN" ? req.user.cooperative : null;
  const bookings = await bookingService.getCooperativeBookings(cooperativeId);
  return ApiResponse.success(res, { message: "Cooperative bookings fetched", data: { bookings } });
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getAllBookings();
  return ApiResponse.success(res, { message: "All bookings fetched", data: { bookings } });
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id);
  return ApiResponse.success(res, { message: "Booking details fetched", data: { booking } });
});

module.exports = {
  createBooking,
  getCustomerBookings,
  getWorkerBookings,
  updateStatus,
  getCooperativeBookings,
  getAllBookings,
  getBookingById,
};
