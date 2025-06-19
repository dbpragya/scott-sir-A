// VALIDATION DONE

const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');

// Validation Done
const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  try {
    const { first_name, last_name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: false,
        message: "Passwords do not match.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "User already exists with this email.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // const otp = crypto.randomInt(1000, 9999).toString();
    const otp = '0000';
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const newUser = new User({
      first_name,
      last_name,
      email,
      otp,
      otpExpiry,
      password: hashedPassword,
    });

    await newUser.save();

    await sendEmail(
      newUser.email,
      "Confirm your email",
      `Your OTP is: ${otp}`
    );

    return res.status(201).json({
      status: true,
      message: "Please verify your email to continue.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const verifyOtp = async (req, res) => {
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
    user.isVerify = true;
    user.save();
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    return res.status(200).json({
      status: true,
      message: "OTP verified successfully",
      token,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        profilePicture: `${process.env.SERVER_URL}/${user.profilePicture}`,
        isVerify: user.isVerify,
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Validation Done
const createPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  const { password } = req.body;

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ status: false, message: "No token, access denied" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ status: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.isVerify = true;
    await user.save();
    console.log("Password saved for user:", user._id);

    res.status(200).json({
      status: true,
      message: "Password set successfully. You can now log in."
    });
  } catch (error) {
    console.error("Create Password Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// Validation Done
const resendOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // const otp = crypto.randomInt(1000, 9999).toString();
    const otp = '0000'
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(user.email, "Password Reset OTP", `Your OTP is: ${otp}`);

    res.status(200).json({ status: true, message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message || error });
  }
};


// Validation Done
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ status: false, message: "Invalid email or password" });
    }

    if (typeof user.password !== 'string') {
      return res.status(500).json({ status: false, message: "Stored password is invalid." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: false, message: "Invalid password" });
    }

    if (!user.isVerify) {
      // const otp = crypto.randomInt(1000, 9999).toString();
      const otp = '0000';
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      user.otp = otp;
      user.otpExpiry = otpExpiry
      await user.save();

      await sendEmail(
        user.email,
        "Confirm your email",
        `Your OTP is: ${otp}`
      );
      return res.status(200).json({
        status: true,
        message: "Please verify your email to continue.",
        data: {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          profilePicture: `${process.env.SERVER_URL}/${user.profilePicture}`,
          isVerify: user.isVerify,
        }
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        profilePicture: `${process.env.SERVER_URL}/${user.profilePicture}`,
        isVerify: user.isVerify,
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


const path = require('path');

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No file uploaded' });
    }

    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: req.file.path },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    res.status(200).json({
      status: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: `${process.env.SERVER_URL}/${updatedUser.profilePicture}`,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

module.exports = { signup, verifyOtp, createPassword, resendOtp, login, uploadProfilePicture };
