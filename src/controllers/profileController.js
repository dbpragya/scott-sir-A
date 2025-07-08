const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Event = require("../models/Event");
const bcrypt = require("bcryptjs");
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { body, validationResult } = require("express-validator");

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
      data: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        profilePicture: user.profilePicture
          ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, '/')}`
          : '',
        badges: user.badges || []
      }
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// Validation Done
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  const { first_name, last_name } = req.body; // Removed email from destructuring

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

    // Update user profile fields
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;

    // Save updated user profile
    await user.save();

    // Format the profile picture URL and prepare the response
    const profilePictureUrl = user.profilePicture
      ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, '/')}`
      : '';

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email, // Include email in the response
        profilePicture: profilePictureUrl, // Format profile picture URL
        badges: user.badges || [] // Include badges in the response
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

    const events = await Event.find({ createdBy: decoded.id, isFinalized: true }).sort({ createdAt: -1 });

    if (events.length === 0) {
      return res.status(400).json({ status: false, message: "No finalized events found" });
    }

    // Grouping events by month and including invitationCustomization
    const groupedEvents = events.reduce((acc, event) => {
      const month = new Date(event.dates[0].date).toLocaleString('default', { month: 'long', year: 'numeric' });
      
      // Ensure invitationCustomization exists
      const invitationCustomization = event.invitationCustomization;  // Default to "Theme1" if not provided

      if (!acc[month]) acc[month] = [];
      acc[month].push({
        eventId: event._id || '',
        name: event.name || '',
        date: event.dates[0]?.date ? new Date(event.dates[0].date).toLocaleDateString() : '',
        timeSlot: event.dates[0]?.timeSlot || '',
        totalVoted: event.votes ? event.votes.length : 0,
        invitationCustomization: invitationCustomization || '',  // Add invitationCustomization to the event
      });
      return acc;
    }, {});

    // Convert the grouped events into an array format
    const formattedGroupedEvents = Object.keys(groupedEvents).map(month => ({
      month: month,
      events: groupedEvents[month],
    }));

    res.status(200).json({
      status: true,
      message: "Total finalized events fetched successfully",
      data: formattedGroupedEvents, // Return the data in the desired format
    });
  } catch (error) {
    console.error("Get Events Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


// Validation Done
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (currentPassword === newPassword) {
    return res.status(400).json({ status: false, message: 'New password cannot be the same as the current password.' });
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


exports.logout = async (req, res) => {
  try {
    const { deviceToken } = req.body;  

    if (!deviceToken) {
      return res.status(400).json({
        status: false,
        message: "Please provide deviceToken to log out."
      });
    }

    // Find the user by the deviceToken in the deviceTokens array
    const user = await User.findOne({ deviceTokens: deviceToken });

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found with the provided deviceToken."
      });
    }

    // Remove the deviceToken from the deviceTokens array
    user.deviceTokens = user.deviceTokens.filter(token => token !== deviceToken);

    // Save the updated user document
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Logged out successfully and deviceToken removed."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error, please try again later."
    });
  }
};


// Validation Done
exports.updateAllNotifications = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  const { allNotifications } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    user.allNotifications = allNotifications;
    await user.save();

    return res.status(200).json({ status: true, message: 'All notifications updated successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Server error, please try again later.' });
  }
};

// Validation Done
exports.updateChatNotifications = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }

  const { chatNotifications } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    user.chatNotifications = chatNotifications;
    await user.save();

    return res.status(200).json({ status: true, message: 'Chat notifications updated successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Server error, please try again later.' });
  }
};


exports.getPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findOne();
    if (!plan) {
      return res.status(404).json({ status: false, message: 'Subscription plan not found' });
    }
      return res.status(200).json({ status: true, message: 'Plan fetched successfully', data: plan });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error, please try again later.' });
  }
};

exports.purchasePlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ status: false, message: 'paymentId is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    const plan = await SubscriptionPlan.findOne();
    if (!plan) {
      return res.status(404).json({ status: false, message: 'Subscription plan not found' });
    }

    const now = new Date();
    let expiryDate = new Date(now);

    switch (plan.duration) {
      case 'day':
        expiryDate.setUTCDate(expiryDate.getUTCDate() + 1);
        break;
      case 'week':
        expiryDate.setUTCDate(expiryDate.getUTCDate() + 7);
        break;
      case 'month':
        expiryDate.setUTCMonth(expiryDate.getUTCMonth() + 1);
        break;
      case 'year':
        expiryDate.setUTCFullYear(expiryDate.getUTCFullYear() + 1);
        break;
      default:
        expiryDate.setUTCFullYear(expiryDate.getUTCFullYear() + 1);
    }

    if (
      user.subscription &&
      user.subscription.status === 'active' &&
      user.subscription.expiryDate &&
      new Date(user.subscription.expiryDate) > now
    ) {
      if (new Date(user.subscription.expiryDate) < expiryDate) {
        user.subscription.expiryDate = expiryDate;
        await user.save();
        return res.status(200).json({ status: true, message: 'Subscription extended', subscription: user.subscription });
      }
      return res.status(200).json({ status: true, message: 'Subscription already active', subscription: user.subscription });
    }

    user.subscription = {
      planId: plan._id,
      startDate: now,
      expiryDate,
      status: 'active',
      paymentId,
    };

    await user.save();

    return res.status(201).json({ status: true, message: 'Subscription activated', subscription: user.subscription });
  } catch (error) {
    console.error('Error in purchasePlan:', error);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};





