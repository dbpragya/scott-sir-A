const express = require('express');
const { login,signup,verifyOtp,resendOtp, createPassword, uploadProfilePicture} = require('../controllers/authController');
const {signupValidation,verifyOtpValidation } = require("../validators/validation");
const router = express.Router();
const authenticateUser = require('../middleware/authmiddleware'); // Ensure user is authenticated
const upload = require('../middleware/uploadMiddleware'); // Import multer middleware

router.get("/test", (req, res) => {res.send("Auth route working!");});
router.post("/login", login);
router.post("/signup", signupValidation , signup);
router.post("/verify-otp", verifyOtpValidation, verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/create-password", signupValidation , createPassword);
router.post('/upload-profile-picture', authenticateUser, upload, uploadProfilePicture);

module.exports = router;