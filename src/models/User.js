const mongoose = require("mongoose");


const BASE_URL = "https://oyster-app-g2hmu.ondigitalocean.app";

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  profilePicture: {
    type: String,
    default: `uploads/image%20(5).png`  
  },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  deviceTokens: { type: [String], default: [] },
  isVerify: { type: Boolean, default: false },
  status: { type: Boolean, default: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  allNotifications: { type: Boolean, default: true },
  chatNotifications: { type: Boolean, default: true },
  isOtpVerified:{type:Boolean, default:false},
  subscription: {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    startDate: { type: Date },
    expiryDate: { type: Date },
    status: { type: String, enum: ['active', 'expired', 'cancelled', 'none'], default: 'none' },
  },

  badges: [{
    name: { type: String, required: true },
    awardedAt: { type: Date, default: Date.now },
        image: { type: String, required: false }


  }],
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
