const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },  
  image: { type: String, default: '' },
  otp: { type: String, default: null },  
  otpExpiry: { type: Date, default: null },
  deviceToken: { type: [String], default: [] },
  isVerify: { type: Boolean, default: null },  
  status: { type: Boolean, default: true },   
  role: { type: String, enum: ["admin", "user"], default: "user" },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
