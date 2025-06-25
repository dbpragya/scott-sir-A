// VALIDATION DONE

const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");


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
    const { first_name, last_name, email, password, confirmPassword } =
      req.body;

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

    // OTP generation for testing purposes, will use a static value "0000"
    const otp = "0000";
    const hashedOtp = await bcrypt.hash(otp, 10); // Hash the OTP before saving it
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Set expiry time

    const newUser = new User({
      first_name,
      last_name,
      email,
      otp: hashedOtp, // Save the hashed OTP
      otpExpiry,
      password: hashedPassword,
    });

    await newUser.save();

    await sendEmail({
      to: newUser.email,
      subject: "Confirm your email",
      text: `Your OTP is: ${otp}`,
    });

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
      return res.status(400).json({ status: false, message: "OTP has expired" });
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

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully",
      token,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        profilePicture: user.profilePicture ? [`${process.env.LIVE_URL}/${user.profilePicture}`] : [],
        isVerify: user.isVerify,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error?.message || "Internal Server Error!",
    });
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

    // Generate a new OTP (hardcoded as "0000" for testing purposes)
    const otp = "0000"; // Hardcoded for testing
    const hashedOtp = await bcrypt.hash(otp, 10); // Hash the OTP before saving
    user.otp = hashedOtp; // Save the hashed OTP
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // OTP expiry time (10 minutes)
    await user.save();

    // Send the OTP to the user via email
    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}`, // Send the plain OTP in the email for testing
    });

    return res.status(200).json({ status: true, message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error?.message || "Internal server error" });
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

    // Check if the user is verified first
    if (!user.isVerify) {
      // If the user is not verified, generate OTP and send email
      const otp = "0000"; // This can be generated dynamically
      const hashedOtp = await bcrypt.hash(otp, 10); // Hash the OTP before saving
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Set expiry time

      user.otp = hashedOtp;  // Save the hashed OTP
      user.otpExpiry = otpExpiry; // Save OTP expiry time
      await user.save();

      // Send verification email with OTP
      await sendEmail({
        to: user.email,
        subject: "Confirm your email",
        text: `Your OTP is: ${otp}`,
      });

      // Respond with a message about email verification along with user data
      return res.status(200).json({
        status: true,
        message: "Please verify your email to continue.",
        data: {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          profilePicture: user.profilePicture ? [`${process.env.LIVE_URL}/${user.profilePicture}`] : '',
          isVerify: user.isVerify,
        }
      });
    }

    // Password check only after the user is verified
    if (typeof user.password !== "string") {
      return res.status(500).json({ status: false, message: "Stored password is invalid." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: false, message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
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
        profilePicture: user.profilePicture ? [`${process.env.LIVE_URL}/${user.profilePicture}`] : '',
        isVerify: user.isVerify,
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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: req.file.path },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    res.status(200).json({
      status: true,
      message: "Profile picture uploaded successfully",
      profilePicture: `${process.env.LIVE_URL}/${updatedUser.profilePicture}`,
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
      return res.status(400).json({ status: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error("Error: User not found with email:", email);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Generate OTP (mocked as "0000")
    const otp = "0000";
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.otp = hashedOtp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins expiry
    user.isOtpVerified = false;
    await user.save();

    // Validate that email is a valid format before sending
    if (!/\S+@\S+\.\S+/.test(email)) {
      console.error("Error: Invalid email format:", email);
      return res.status(400).json({ status: false, message: "Invalid email format" });
    }

    // Log the details before calling sendEmail
    console.log("Sending OTP to email:", email);

    // Correcting the variable to use 'user' instead of 'newUser'
    await sendEmail({
      to: user.email, // Use 'user' here instead of 'newUser'
      subject: "Confirm your email",
      text: `Your OTP is: ${otp}`,
    });

    return res.json({ status: true, message: "OTP sent to email." });
  } catch (error) {
    console.error("Error in forgotPassword function:", error);
    next(error);
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
      return res.status(400).json({ status: false, message: "Incorrect OTP." });
    }
    user.isOtpVerified = true;
    await user.save();
    return res.json({ status: true, message: "OTP verified successfully." });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isOtpVerified) {
      return res.status(400).json({ status: false, message: "OTP verification required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ status: false, message: "Passwords do not match." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    user.isOtpVerified = false;
    await user.save();
    return res.json({ status: true, message: "Password reset successfully." });
  } catch (error) {
    next(error);
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
};
