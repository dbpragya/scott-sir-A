// VALIDATION DONE

const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Generate random OTP function
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString(); // Generates 4-digit OTP
}

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
    const {
      first_name,
      last_name,
      email,
      password,
      confirmPassword,
      deviceToken,
    } = req.body;

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
    const otp = generateOTP(); //generate random otp
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      first_name,
      last_name,
      email,
      otp: hashedOtp,
      otpExpiry,
      password: hashedPassword,
      deviceTokens: [deviceToken],
    });
    await newUser.save();
    try {
      await sendEmail({
        to: newUser.email,
        subject: "Confirm your email",
        text: `Your OTP is: ${otp}`,
      });
      console.log(`Email sent successfully to: ${newUser.email}`);
    } catch (emailError) {
      console.error(`Failed to send email to ${newUser.email}:`, emailError);
    }
    return res.status(200).json({
      status: true,
      message: "Please verify your email to continue.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error!" });
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

    // Use bcrypt to compare the plain OTP with the hashed OTP stored in the database
    const isMatch = await bcrypt.compare(otp, user.otp); // Compare plain OTP with hashed OTP
    if (!isMatch) {
      return res.status(400).json({ status: false, message: "Incorrect OTP." });
    }

    // Check if OTP has expired
    if (user.otpExpiry <= Date.now()) {
      return res
        .status(400)
        .json({ status: false, message: "OTP has expired" });
    }

    // Mark OTP as verified and user as verified
    user.isOtpVerified = true;
    user.isVerify = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const profilePictureUrl = user.profilePicture
      ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, "/")}`
      : "";

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully",
      token,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        profilePicture: profilePictureUrl || "", // Format profile picture URL
        isVerify: user.isVerify,
      },
    });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
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
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ status: false, message: "No token, access denied" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.isVerify = true;
    await user.save();
    console.log("Password saved for user:", user._id);

    res.status(200).json({
      status: true,
      message: "Password set successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Create Password Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

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

    // Generate a new OTP
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.otp = hashedOtp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}`,
    });

    return res
      .status(200)
      .json({ status: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
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

  const { email, password, deviceToken } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid email or password" });
    }

    if (!user.isVerify) {
      const otp = generateOTP();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user.otp = hashedOtp; // Save the hashed OTP
      user.otpExpiry = otpExpiry; // Save OTP expiry time
      await user.save();

      // Send verification email with OTP
      await sendEmail({
        to: user.email,
        subject: "Confirm your email",
        text: `Your OTP is: ${otp}`,
      });

      return res.status(200).json({
        status: true,
        message: "Please verify your email to continue.",
        data: {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          profilePicture: user.profilePicture
            ? `${process.env.LIVE_URL}/${user.profilePicture}`
            : "",
          isVerify: user.isVerify,
        },
      });
    }

    if (typeof user.password !== "string") {
      return res
        .status(500)
        .json({ status: false, message: "Stored password is invalid." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid password" });
    }

    if (!user.deviceTokens) {
      user.deviceTokens = [];
    }

    if (deviceToken) {
      if (!user.deviceTokens.includes(deviceToken)) {
        user.deviceTokens.push(deviceToken);
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        profilePicture: user.profilePicture
          ? `${process.env.LIVE_URL}/${user.profilePicture}`
          : "",
        isVerify: user.isVerify,
        deviceTokens: user.deviceTokens,
      },
    });
  } catch (error) {
    console.error("Error in login function:", error);
    res.status(500).json({ status: false, message: "Internal Server Error!" });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ status: false, message: "No file uploaded" });
    }

    const userId = req.user.id;

    // Normalize the path: convert backslashes -> forward slashes & remove leading slash
    const cleanPath = req.file.path.replace(/\\/g, "/").replace(/^\/+/, "");

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: cleanPath },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const profilePictureUrl = `${process.env.LIVE_URL.replace(/\/$/, "")}/${
      updatedUser.profilePicture
    }`;

    res.status(200).json({
      status: true,
      message: "Profile picture uploaded successfully",
      profilePicture: profilePictureUrl,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ status: false, message: "Internal Server Error!" });
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log("Received email:", email);

    if (!email) {
      console.error("Error: Email is required");
      return res
        .status(400)
        .json({ status: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error("Error: User not found with email:", email);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.otp = hashedOtp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    user.isOtpVerified = false;
    await user.save();

    if (!/\S+@\S+\.\S+/.test(email)) {
      console.error("Error: Invalid email format:", email);
      return res
        .status(400)
        .json({ status: false, message: "Invalid email format" });
    }
    console.log("Sending OTP to email:", email);

    await sendEmail({
      to: user.email,
      subject: "Confirm your email",
      text: `Your OTP is: ${otp}`,
    });

    return res.json({ status: true, message: "OTP sent to email." });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const verifyResetPassword = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otpExpiry) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid or expired OTP." });
    }

    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({ status: false, message: "OTP expired." });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ status: false, message: "Invalid OTP." });
    }
    user.isOtpVerified = true;
    await user.save();
    return res.json({ status: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    const user = await User.findOne({ email });
    // if (!user || !user.isOtpVerified) {
    //   return res.status(400).json({ status: false, message: "OTP verification required." });
    // }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ status: false, message: "Passwords do not match." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    user.isOtpVerified = false;
    await user.save();
    return res.json({ status: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("userId", userId);

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    res.status(200).json({
      status: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ status: false, message: "Internal Server Error!" });
  }
};

module.exports = {
  signup,
  verifyOtp,
  createPassword,
  resendOtp,
  login,
  uploadProfilePicture,
  forgotPassword,
  verifyResetPassword,
  resetPassword,
  deleteAccount,
};
