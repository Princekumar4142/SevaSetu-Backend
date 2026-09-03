const Subscriber = require("../models/Subscriber");
const { sendSubscriptionWelcomeEmail } = require("../services/email.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

/**
 * POST /api/subscribers
 * Subscribe a new email for updates/offers/new services.
 */
const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw ApiError.badRequest("Please provide a valid email address");
  }

  // Check if already subscribed
  const existing = await Subscriber.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    if (existing.active) {
      return ApiResponse.success(res, {
        message: "You are already subscribed! You will continue to receive updates.",
        data: { alreadySubscribed: true },
        statusCode: 200,
      });
    }
    // Reactivate
    existing.active = true;
    existing.subscribedAt = new Date();
    await existing.save();
  } else {
    await Subscriber.create({ email: email.toLowerCase().trim() });
  }

  // Send welcome email
  try {
    await sendSubscriptionWelcomeEmail(email.toLowerCase().trim());
  } catch (err) {
    // Don't fail the subscription if email sending fails
    // eslint-disable-next-line no-console
    console.error("[SUBSCRIBER] Failed to send welcome email:", err.message);
  }

  return ApiResponse.success(res, {
    message: "Successfully subscribed! Check your email for a welcome message.",
    data: { subscribed: true },
    statusCode: 201,
  });
});

module.exports = { subscribe };
