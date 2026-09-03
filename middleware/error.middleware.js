const { nodeEnv } = require("../config/env");

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details;

  // Translate common Mongoose/Mongo errors into clean, non-leaky responses.
  if (err.name === "ValidationError") {
    statusCode = 400;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = "Validation failed";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for '${err.path}'`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `An account with this ${field} already exists`;
  }

  if (!err.isOperational && statusCode === 500 && nodeEnv !== "production") {
    // eslint-disable-next-line no-console
    console.error(err); // full stack trace in dev only, never sent to the client
  } else if (!err.isOperational && statusCode === 500) {
    // eslint-disable-next-line no-console
    console.error(err.message);
    message = "Something went wrong. Please try again."; // don't leak internals in prod
  }

  res.status(statusCode).json({ success: false, message, ...(details ? { details } : {}) });
}

module.exports = errorMiddleware;
