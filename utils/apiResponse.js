/**
 * Consistent response envelope used across every endpoint:
 *   Success: { success: true, message, data }
 *   Failure: { success: false, message }
 * See PHASE 1 SPEC Section 13 — Error Handling.
 */
class ApiResponse {
  static success(res, { message = "Operation successful", data = {}, statusCode = 200 } = {}) {
    return res.status(statusCode).json({ success: true, message, data });
  }
}

module.exports = ApiResponse;
