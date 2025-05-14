const User = require('../models/User'); 
const jwt = require('jsonwebtoken');  
const Event = require("../models/Event");
const bcrypt = require("bcryptjs");

exports.getProfile = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', ''); 

    if (!token) {
      return res.status(401).json({ status: false, message: "No token, access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id; 

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    res.status(200).json({
      status: true,
      message: "Profile fetched successfully",
      user: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


exports.updateProfile = async (req, res) => {
 

  const { first_name, last_name, email } = req.body;

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ status: false, message: "No token, access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    const userId = decoded.id; 

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ status: false, message: "Email is already in use" });
      }
    }

    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.email = email || user.email;

    await user.save();

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      user: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

exports.getTotalEvents = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ status: false, message: "No token, access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); 

    const events = await Event.find({ createdBy: decoded.id }).sort({ createdAt: -1 });  

    if (events.length === 0) {
      return res.status(400).json({ status: false, message: "No events found" });
    }

    res.status(200).json({
      status: true,
      message: "Total events fetched successfully",
      events: events.map(event => ({
        name: event.name,
        date: event.dates[0]?.date ? new Date(event.dates[0].date).toLocaleDateString() : 'N/A', 
        timeSlot: event.dates[0]?.timeSlot || 'N/A',  
        totalVoted: event.votedCount || 0, 
      })),
    });
  } catch (error) {
    console.error("Get Events Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ status: false, message: 'All fields are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ status: false, message: 'New password and confirm password do not match.' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ status: false, message: 'New password cannot be the same as the current password.' });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; 
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ status: false, message: 'Password must be at least 8 characters long and include letters and numbers.' });
  }

  try {
    const user = await User.findById(req.user.id); 
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: false, message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ status: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Server error, please try again later.' });
  }
};

exports.logout = (req, res) => {
  try {
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error, please try again later.' });
  }
};


exports.updateAllNotifications = async (req, res) => {
  const { allNotifications } = req.body; 
  // Validate input
  if (typeof allNotifications !== 'boolean') {
    return res.status(400).json({ message: 'Invalid input, please provide a boolean value.' });
  }

  try {
    const user = await User.findById(req.user.id);  
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.allNotifications = allNotifications;
    await user.save();

    return res.status(200).json({ message: 'All notifications updated successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error, please try again later.' });
  }
};



exports.updateChatNotifications = async (req, res) => {
  const { chatNotifications } = req.body; 

  if (typeof chatNotifications !== 'boolean') {
    return res.status(400).json({ message: 'Invalid input, please provide a boolean value.' });
  }

  try {
    const user = await User.findById(req.user.id); 
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.chatNotifications = chatNotifications;
    await user.save();

    return res.status(200).json({ message: 'Chat notifications updated successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error, please try again later.' });
  }
};

