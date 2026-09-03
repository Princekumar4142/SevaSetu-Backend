/**
 * Wraps an async controller/middleware so any thrown/rejected error is
 * forwarded to next() instead of crashing the process or needing a
 * try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
