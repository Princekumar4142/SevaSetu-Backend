const ApiError = require("../utils/apiError");

/**
 * Usage: router.get("/x", protect, authorize("COOPERATIVE_ADMIN", "FEDERATION_ADMIN"), handler)
 * Must run after `protect` so req.user is populated.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role '${req.user.role}' is not permitted to access this resource`));
    }
    next();
  };
}

/**
 * A cooperative admin may only act on their own cooperative's data.
 * Compares req.user.cooperative against a cooperativeId resolved from the request
 * (param, query, or body — first match wins). PLATFORM_ADMIN and FEDERATION_ADMIN
 * bypass this check (federation admins are scoped separately where needed).
 */
function scopeToOwnCooperative(req, res, next) {
  if (["PLATFORM_ADMIN", "FEDERATION_ADMIN"].includes(req.user.role)) return next();

  const requestedCoopId = req.params.cooperativeId || req.query.cooperativeId || req.body.cooperativeId;
  if (!requestedCoopId) return next(); // no specific cooperative targeted — let controller scope by req.user.cooperative

  if (!req.user.cooperative || String(req.user.cooperative) !== String(requestedCoopId)) {
    return next(ApiError.forbidden("You cannot access another cooperative's data"));
  }
  next();
}

module.exports = { authorize, scopeToOwnCooperative };
