const { body } = require("express-validator");

const signupValidation = [
  body("first_name")
    .notEmpty()
    .withMessage("First name is required"),
  body("last_name")
    .notEmpty()
    .withMessage("Last name is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
];

const verifyOtpValidation = [
    body("otp")
    .notEmpty()
    .withMessage("Otp is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),

];

module.exports = { signupValidation , verifyOtpValidation };
