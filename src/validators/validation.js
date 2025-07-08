const { body, param, check, validationResult } = require("express-validator");

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

const voteOnEventValidation = [
  param("eventId")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Event ID must be a valid MongoDB ObjectId"),

  body("selectedDate")
    .notEmpty()
    .withMessage("Please select a date to vote.")
    .custom(value => {
      // Extract only the YYYY-MM-DD part
      const match = value.match(/\d{4}-\d{2}-\d{2}/);
      if (!match) {
        throw new Error("Selected date must contain a valid YYYY-MM-DD part");
      }

      const isoDate = match[0];
      if (isNaN(Date.parse(isoDate))) {
        throw new Error("Selected date is not valid");
      }

      return true;
    }),

  body("voteType")
    .notEmpty()
    .withMessage("Vote type is required")
    .isIn(["yes", "no", "Yes", "No", "YES", "NO"])
    .withMessage("Vote type must be 'yes' or 'no'")
];


const finalizeEventDateValidation = [
  param("eventId")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Event ID must be a valid MongoDB ObjectId"),

  body("selectedDate")
    .notEmpty()
    .withMessage("Please provide the selected date to finalize.")
];

const signupValidationRules = [
  check('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2 }).withMessage('First name must be at least 2 characters long')
    .matches(/^[A-Za-z\s]+$/).withMessage('First name can only contain lettera'),

  check('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters long')
    .matches(/^[A-Za-z\s]+$/).withMessage('Last name can only contain letters'),

  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  
    check('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    // .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')  // Optional: Ensure at least one uppercase letter
    // .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')  // Optional: Ensure at least one lowercase letter
    // .matches(/[0-9]/).withMessage('Password must contain at least one number')  // Optional: Ensure at least one number
    // .matches(/[@$!%*?&]/).withMessage('Password must contain at least one special character'),  // Optional: Ensure at least one special character

  // Confirm Password Validation
  check('confirmPassword')
    .trim()
    .notEmpty().withMessage('Confirm Password is required')
    .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
];


const verifyOtpValidationRules = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  check('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
    .isNumeric().withMessage('OTP must be a number'),
];


const createPasswordValidationRules = [
  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),

  check('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

const resendOtpValidationRules = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

const emailValidationRules = [check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
  ]

const resetPasswordRules =  [
    check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

    check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),

  check('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
]


const loginValidationRules = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  check('password')
    .notEmpty().withMessage('Password is required'),
];

const updateProfileValidationRules = [
  body('first_name')
    .optional()
    .trim()
    .notEmpty().withMessage('First name cannot be empty')
    .isLength({ min: 2 }).withMessage('First name must be at least 2 characters')
    .matches(/^[A-Za-z\s]+$/).withMessage('First name can only contain letters'),

  body('last_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Last name cannot be empty')
    .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters')
    .matches(/^[A-Za-z\s]+$/).withMessage('Last name can only contain letters'),

  body('email')
    .optional()
    .trim()
    .notEmpty().withMessage('Email cannot be empty')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
];


const changePasswordValidationRules = [ 
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Confirm password must match new password'),
];

const updateAllNotificationsValidationRules = [
  body('allNotifications')
    .exists().withMessage('allNotifications field is required')
    .notEmpty().withMessage('allNotifications field cannot be empty')
    .isBoolean().withMessage('allNotifications must be a boolean value'),
];


const updateChatNotificationsValidationRules = [
  body('chatNotifications')
    .exists().withMessage('chatNotifications field is required')
    .notEmpty().withMessage('chatNotifications field cannot be empty')
    .isBoolean().withMessage('chatNotifications must be a boolean value'),
];

const handleValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array();
    return res.status(400).json({
      status: false,
      message: message[0].msg || "Validation failed",
    });
  }
  next();
};


module.exports = {
  createEventValidation,
  voteOnEventValidation,
  finalizeEventDateValidation,
  signupValidationRules,
  verifyOtpValidationRules,
  createPasswordValidationRules,
  resendOtpValidationRules,
  loginValidationRules,
  updateProfileValidationRules,
  changePasswordValidationRules,
  updateAllNotificationsValidationRules,
  updateChatNotificationsValidationRules,
  emailValidationRules,
  handleValidationResult,
  resetPasswordRules,
};
