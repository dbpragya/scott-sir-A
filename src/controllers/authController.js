const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");  
const crypto = require("crypto");

const signup = async (req, res) => 
{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  try {
    const { first_name, last_name, email } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "User already exists with this email.",
      });
    }

    // Generate a random 4-digit OTP and expiry time (10 minutes from now)
    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

    // Create a new user 
    const newUser = new User({
      first_name,
      last_name,
      email,
      otp,
      otpExpiry,
    });

    // Save the new user to the database
    await newUser.save();

    await sendEmail(newUser.email, "Confirm your email", `Your OTP is: ${otp}`);

    return res.status(201).json({
      status: true,
      message: "User Created Successfully!  Please verify your email to continue..",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const verifyOtp = async(req,res) => 
{
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
     return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
   }
   
   const { email, otp } = req.body;
   try {
     const user = await User.findOne({ email });
 
     if (!user) {
       return res.status(400).json({ status: false, message: "User not found" });
     }
     
     if (user.otp !== otp) {
       return res.status(400).json({ status: false, message: "Invalid OTP" });
     }
     
     if (user.otpExpiry <= Date.now()) {
       return res.status(400).json({ status: false, message: "OTP has expired" });
     }
     
     return res.status(200).json({ status: true, message: "Otp verified successfully" });
   } catch (error) {
     res.status(500).json({ status: false, message: error });
   }
}

const createPassword = async(req,res) => {
   
}

const resendOtp = async(req,res)=>{

   await Promise.all([
      body("email").notEmpty().withMessage("Email is required").run(req),
      body("email").isEmail().withMessage("Invalid email format").run(req),
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({ status: false, message: firstError.msg });
    }
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }
      const otp = crypto.randomInt(1000, 9999).toString();
      user.otp = otp;
      user.otpExpiry = Date.now() + 10 * 60 * 1000;
      await user.save();
      const mailCheck = await sendEmail(user.email, "Password Reset OTP", `Your OTP is: ${otp}`);
      res.status(200).json({ status: true, message: "OTP resent successfully" });
    } catch (error) {
      res.status(500).json({ status: false, message: error });
    }
}
 
const login = async (req, res) => {

   console.log("hello from login function");  
};


module.exports = { login,signup,createPassword,verifyOtp,resendOtp };
