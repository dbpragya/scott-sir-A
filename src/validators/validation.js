const { body, param } = require("express-validator");

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


// Create event validation
const createEventValidation = [
  body("name")
    .notEmpty()
    .withMessage("Event name is required")
    .isString()
    .withMessage("Event name must be a string"),

  body("location")
    .optional()
    .notEmpty()
    .withMessage("Location is required")
    .isString()
    .withMessage("Location must be a string"),

  body("description")
    .optional()
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .withMessage("Description must be a string")
    .custom(value => {
      if (/^\d+$/.test(value)) {
        throw new Error("Description cannot be numeric only");
      }
      return true;
    }),

  body("votingTime")
    .notEmpty()
    .withMessage("Voting time is required")
    .isIn(["24hrs", "48hrs"])
    .withMessage("Voting time must be either '24hrs' or '48hrs'"),

  body("dates")
    .isArray({ min: 1 })
    .withMessage("Dates must be a non-empty array"),

  body("dates.*.date")
    .notEmpty()
    .withMessage("Each date is required")
    .isISO8601()
    .toDate()
    .withMessage("Date must be a valid ISO 8601 date"),

  body("dates.*.timeSlot")
    .notEmpty()
    .withMessage("Each timeSlot is required")
    .isIn(["Morning", "Afternoon", "Evening"])
    .withMessage("timeSlot must be one of: Morning, Afternoon, Evening"),

  body("invitationCustomization").optional().isObject(),

  body("invitationCustomization.premiumTheme")
    .optional()
    .isIn(["Lavender", "Make blue", "sku blue", "spicy red", "summer", "night light"])
    .withMessage("Invalid premiumTheme value"),
];




// Vote on event validation (date only, no time)
const voteOnEventValidation = [
  param("eventId")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Event ID must be a valid MongoDB ObjectId"),

  body("selectedDate")
    .notEmpty()
    .withMessage("Please select a date to vote.")
    .isISO8601()
    .toDate()
    .custom(value => {
      // Ensure the selected date is only a date and not a time
      const dateOnly = new Date(value).toISOString().split('T')[0]; // Get only the date part
      if (new Date(value).toISOString().split('T')[1] !== "00:00:00.000Z") {
        throw new Error("Time should not be selected, only the date.");
      }
      return true;
    })
    .withMessage("Selected date must be a valid ISO 8601 date without time"),
];


// Validation for finalizeEventDate
const finalizeEventDateValidation = [
  param("eventId")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Event ID must be a valid MongoDB ObjectId"),

  body("selectedDate")
    .notEmpty()
    .withMessage("Please provide the selected date to finalize.")
    .isISO8601()
    .toDate()
    .withMessage("Selected date must be a valid ISO 8601 date")
    .custom(value => {
      // Ensure time is not selected, only date
      if (new Date(value).toISOString().split('T')[1] !== "00:00:00.000Z") {
        throw new Error("Time should not be selected, only the date.");
      }
      return true;
    }),
];


module.exports = {
  signupValidation,
  verifyOtpValidation,
  createEventValidation,
  voteOnEventValidation,
  finalizeEventDateValidation
};
