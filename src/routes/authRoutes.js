const express = require('express');
const { login,signup,verifyOtp,resendOtp,createPassword} = require('../controllers/authController');
const {signupValidation,verifyOtpValidation } = require("../validators/validation");
const router = express.Router();

router.get("/test", (req, res) => {res.send("Auth route working!");});
router.post("/login", login);
router.post("/signup", signupValidation , signup);
router.post("/verify-otp", verifyOtpValidation, verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/create-password", signupValidation , createPassword);

module.exports = router;