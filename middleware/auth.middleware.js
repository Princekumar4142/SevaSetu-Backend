const { verifyToken } = require("../utils/token");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");

/**
 * Verifies the Bearer token, loads the user, and attaches it to req.user.
 * Rejects if the token is missing/invalid/expired, or the account is deactivated.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized("No authentication token provided");

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") throw ApiError.unauthorized("Session expired — please log in again");
    throw ApiError.unauthorized("Invalid authentication token");
  }

  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  if (!user.isActive) throw ApiError.forbidden("This account has been deactivated");

  req.user = user;
  next();
});

module.exports = protect;
