const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Event = require("../models/Event");
const bcrypt = require("bcryptjs");
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Transaction = require('../models/Transaction');
const { body, validationResult } = require("express-validator");
const mongoose = require('mongoose');
const BADGES = require('../constants/badges');

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

    let badges = (user.badges || []).map(badge => {
      // Find matching badge in constants for description
      const badgeFromConst = Object.values(BADGES).find(b => b.name === badge.name);
      return {
        _id: badge._id ? String(badge._id) : "",
        name: badge.name || "",
        awardedAt: badge.awardedAt || "",
        image: badge.image
          ? `${process.env.LIVE_URL}${badge.image.replace(/\\/g, '/')}`
          : "",
        description: badgeFromConst ? badgeFromConst.description : ""
      };
    });

    // If no badges, return at least one object with empty fields
    if (badges.length === 0) {
      badges = [
        { _id: "", name: "", awardedAt: "", image: "", description: "" }
      ];
    }

    // Complete badge info from BADGES constants
    const badgeinfo = Object.values(BADGES).map(badge => ({
      name: badge.name,
      image: `${process.env.LIVE_URL}${badge.image}`,
      description: badge.description
    }));

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
        badges,
        badgeinfo
      }
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


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

    // Normalize profile picture path before building the URL
    const profilePicturePath = user.profilePicture
      ? user.profilePicture.replace(/\\/g, '/').replace(/^\/+/, '') // remove backslashes + leading slashes
      : '';

    // Format the profile picture URL and prepare the response
    const profilePictureUrl = user.profilePicture
      ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, '/')}`
      : '';

    // --- FIXED BADGES PART ---
    let badges = (user.badges || []).map(badge => ({
      _id: badge._id ? String(badge._id) : "",
      name: badge.name || "",
      awardedAt: badge.awardedAt || "",
      image: badge.image
        ? `${process.env.LIVE_URL}${badge.image.replace(/\\/g, '/')}`
        : ""
    }));

    if (badges.length === 0) {
      badges = [
        { _id: "", name: "", awardedAt: "", image: "" }
      ];
    }
    // ------------------------

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email, 
        profilePicture: profilePictureUrl, 
        badges
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
      const invitationCustomization = event.invitationCustomization;

      if (!acc[month]) acc[month] = [];
      acc[month].push({
        eventId: event._id || '',
        name: event.name || '',
        date: event.dates[0]?.date ? new Date(event.dates[0].date).toLocaleDateString() : '',
        timeSlot: event.dates[0]?.timeSlot || '',
        totalVoted: event.votes ? event.votes.length : 0,
        invitationCustomization: invitationCustomization || '',
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

    // If deviceToken is empty, return a success message
    if (!deviceToken) {
      return res.status(200).json({
        status: true,
        message: "Logged out successfully."
      });
    }

    // Find the user by the deviceToken in the deviceTokens array
    const user = await User.findOne({ deviceTokens: deviceToken });

    // If the user is not found, still return a successful message
    if (!user) {
      return res.status(200).json({
        status: true,
        message: "Logged out successfully."
      });
    }

    // Check if the deviceToken exists in the user's deviceTokens array
    if (user.deviceTokens.includes(deviceToken)) {
      // Remove the deviceToken from the deviceTokens array
      user.deviceTokens = user.deviceTokens.filter(token => token !== deviceToken);

      // Save the updated user document
      await user.save();

      return res.status(200).json({
        status: true,
        message: "Logged out successfully."
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "Logged out successfully."
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error, please try again later."
    });
  }
};


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


// exports.getPlan = async (req, res) => {
//   try {
//     const userId = req.user.id; // Logged-in user's ID

//     // Find user with subscription
//     const user = await User.findById(userId).select('subscription');
//     if (!user || !user.subscription) {
//       return res.status(404).json({ status: false, message: 'No subscription found for this user' });
//     }

//     // Fetch full subscription plan using planId
//     const plan = await SubscriptionPlan.findById(user.subscription.planId).select('-__v');
//     if (!plan) {
//       return res.status(404).json({ status: false, message: 'Subscription plan not found' });
//     }

//     return res.status(200).json({ 
//       status: true, 
//       message: 'Plan fetched successfully', 
//       data: { 
//         ...plan.toObject(), 
//         isActive: user.subscription.status === 'active',  // ✅ boolean instead of string
//         expiryDate: user.subscription.expiryDate 
//       } 
//     });
//   } catch (error) {
//     res.status(500).json({ status: false, message: 'Server error, please try again later.' });
//   }
// };


exports.getPlan = async (req, res) => {
  try {
    const userId = req.user.id;

    const allPlans = await SubscriptionPlan.find({}).select('-__v');
    const user = await User.findById(userId).select('subscription');
    const userPlanId = user?.subscription?.planId?.toString();

    const plansWithStatus = allPlans.map(plan => ({
      ...plan.toObject(),
      // duration: '',
      isPlan: userPlanId === plan._id.toString(),
      isActive: user?.subscription?.status === 'active' && userPlanId === plan._id.toString(),
      // expiryDate: userPlanId === plan._id.toString() ? user?.subscription?.expiryDate : null
    }));

    return res.status(200).json({
      status: true,
      message: 'Plans fetched successfully',
      data: plansWithStatus
    });
  } catch (error) {
    console.error('Get Plans Error:', error);
    res.status(500).json({
      status: false,
      message: 'Server error, please try again later.'
    });
  }
};

exports.purchasePlan = async (req, res) => {

  try {
    const userId = req.user.id;
    const {
      paymentId,
      planId,
      currency,
      amount,
      paymentMethod,
      paymentStatus
    } = req.body;

    // Validation
    if (!paymentId || paymentId.trim() === '') {
      return res.status(400).json({
        status: false,
        message: 'paymentId is required'
      });
    }

    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({
        status: false,
        message: 'Valid planId is required'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        status: false,
        message: 'Valid amount is required'
      });
    }

    const validStatuses = ['pending', 'completed', 'failed'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        status: false,
        message: 'paymentStatus must be one of: pending, completed, failed'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    // Find plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        status: false,
        message: 'Subscription plan not found'
      });
    }

    // Validate amount matches plan price
    if (parseFloat(amount) !== plan.price) {
      return res.status(400).json({
        status: false,
        message: `Amount must be $${plan.price} for this plan`
      });
    }

    const now = new Date();

    let expiryDate = null;

    // Calculate expiry date based on plan duration
    const calculateExpiryDate = (baseDate) => {
      if (plan.duration === 'lifetime') {
        return null; // No expiry for lifetime plans
      }

      let newDate = new Date(baseDate);
      switch (plan.duration) {
        case 'day':
          newDate.setUTCDate(newDate.getUTCDate() + 1);
          break;
        case 'week':
          newDate.setUTCDate(newDate.getUTCDate() + 7);
          break;
        case 'month':
          newDate.setUTCMonth(newDate.getUTCMonth() + 1);
          break;
        case 'year':
          newDate.setUTCFullYear(newDate.getUTCFullYear() + 1);
          break;
        default:
          newDate.setUTCMonth(newDate.getUTCMonth() + 1);
      }
      return newDate;
    };

    // Create transaction record first
    const transaction = new Transaction({
      userId: user._id,
      planId: plan._id,
      paymentId,
      totalPrice: parseFloat(amount),
      currency: currency.toUpperCase(),
      paymentStatus,
      paymentMethod: paymentMethod,
      subscriptionStartDate: now,
      subscriptionEndDate: calculateExpiryDate(now)
    });

    // Only update user subscription if payment is completed
    if (paymentStatus === 'completed') {
      // Check if user has active subscription
      const hasActiveSubscription = user.subscription &&
        user.subscription.status === 'active' &&
        (!user.subscription.expiryDate || new Date(user.subscription.expiryDate) > now);

      if (hasActiveSubscription) {
        // Extend existing subscription
        const currentExpiry = user.subscription.expiryDate ?
          new Date(user.subscription.expiryDate) : now;
        user.subscription.expiryDate = calculateExpiryDate(currentExpiry);
        user.subscription.paymentId = paymentId;
      } else {
        // Create new subscription
        expiryDate = calculateExpiryDate(now);
        user.subscription = {
          planId: plan._id,
          startDate: now,
          expiryDate,
          status: 'active',
          paymentId,
          eventsCreated: 0,
          lastResetDate: now
        };
      }
    }

    // Save transaction and user
    await Promise.all([transaction.save(), user.save()]);
    if (paymentStatus === 'completed') {
      if (user.subscription.planId !== plan._id) {
        user.subscription.planId = plan._id;
        user.subscription.startDate = now;
        user.subscription.expiryDate = calculateExpiryDate(now);
        user.subscription.status = 'active';
        await user.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: paymentStatus === 'completed' ? 'Plan purchased successfully' : 'Transaction recorded',
      data: {
        transaction: {
          _id: transaction._id,
          paymentId: transaction.paymentId,
          totalPrice: transaction.totalPrice,
          currency: transaction.currency,
          paymentStatus: transaction.paymentStatus,
          transactionDate: transaction.transactionDate
        },
        subscription: paymentStatus === 'completed' ? user.subscription : null,
        plan: {
          _id: plan._id,
          name: plan.name,
          duration: plan.duration,
          eventLimit: plan.eventLimit
        }
      }
    });

  } catch (error) {
    console.error('Error in purchasePlan:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error, please try again later'
    });
  }
};





