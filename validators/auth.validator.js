const { body, validationResult } = require("express-validator");
const ApiError = require("../utils/apiError");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(ApiError.badRequest("Validation failed", errors.array().map((e) => ({ field: e.path, message: e.msg }))));
  }
  next();
}

const phoneRule = body("phone")
  .trim()
  .matches(/^[6-9]\d{9}$/)
  .withMessage("Enter a valid 10-digit Indian phone number");

const passwordRule = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/[A-Za-z]/)
  .withMessage("Password must contain a letter")
  .matches(/[0-9]/)
  .withMessage("Password must contain a number");

const registerCustomerValidator = [
  body("name").trim().notEmpty().withMessage("Full name is required"),
  phoneRule,
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
  passwordRule,
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Passwords do not match");
    return true;
  }),
  handleValidation,
];

const registerWorkerValidator = [
  body("name").trim().notEmpty().withMessage("Full name is required"),
  phoneRule,
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
  passwordRule,
  body("address").trim().notEmpty().withMessage("Address is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("pincode").trim().matches(/^\d{6}$/).withMessage("Enter a valid 6-digit pincode"),
  body("skills").optional().isArray(),
  body("serviceCategory").optional().trim(),
  body("experienceYears").optional().isFloat({ min: 0 }).withMessage("Experience must be a positive number"),
  body("hourlyRate").optional().isFloat({ min: 0 }),
  body("aadharNumber").optional().trim().custom((val) => {
    if (val && !/^\d{12}$/.test(val.replace(/\s+/g, ""))) {
      throw new Error("Enter a valid 12-digit Aadhaar number");
    }
    return true;
  }),
  body("aadharImage").optional(),
  body("hasShop").optional(),
  body("shopName").optional().trim(),
  body("shopImage").optional(),
  body("shopAddress").optional().trim(),
  body("location").optional(),
  handleValidation,
];

const loginValidator = [
  body("identifier").trim().notEmpty().withMessage("Phone or email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidation,
];

const sendOtpValidator = [
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
  handleValidation,
];

const verifyOtpValidator = [
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
  body("otp").trim().matches(/^\d{6}$/).withMessage("Enter the 6-digit code"),
  handleValidation,
];

module.exports = {
  registerCustomerValidator,
  registerWorkerValidator,
  loginValidator,
  sendOtpValidator,
  verifyOtpValidator,
  handleValidation,
};
