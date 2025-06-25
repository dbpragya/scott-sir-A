const express = require('express');
const { login,signup,verifyOtp,resendOtp, createPassword, uploadProfilePicture ,forgotPassword, verifyResetPassword, resetPassword} = require('../controllers/authController');
const { signupValidationRules, verifyOtpValidationRules, createPasswordValidationRules, resendOtpValidationRules, loginValidationRules, emailValidationRules, handleValidationResult ,resetPasswordRules } = require("../validators/validation");
const router = express.Router();
const authenticateUser = require('../middleware/authmiddleware');
const {upload, handleMulterError} = require('../middleware/uploadMiddleware'); 

router.post("/login", loginValidationRules, login);
router.post("/signup", signupValidationRules, signup);
router.post("/verify-otp", verifyOtpValidationRules, verifyOtp);
router.post("/resend-otp", resendOtpValidationRules, resendOtp);
router.post("/create-password", createPasswordValidationRules, createPassword);
router.post('/upload-profile-picture', authenticateUser, upload, handleMulterError, uploadProfilePicture);
router.post("/forgot-password", emailValidationRules, handleValidationResult,  forgotPassword)
router.post("/verify-reset-otp", verifyOtpValidationRules, verifyResetPassword)
router.post("/reset-password",resetPasswordRules, resetPassword);

module.exports = router;