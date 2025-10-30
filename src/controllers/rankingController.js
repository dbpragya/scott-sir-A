const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');
const BADGES = require('../constants/badges');

// Helper function to process badges with descriptions
function processBadges(userBadges) {
  if (!userBadges || userBadges.length === 0) {
    return [];
  }
  
  return userBadges.map(badge => {
    // Find the badge details from constants
    const badgeDetails = Object.values(BADGES).find(b => b.name === badge.name);
    
    return {
      name: badge.name || "",
      image: badge.image 
        ? `${process.env.LIVE_URL}${badge.image.replace(/\\/g, '/')}`
        : (badgeDetails ? `${process.env.LIVE_URL}${badgeDetails.image}` : ""),
      description: badgeDetails ? badgeDetails.description : "",
      awardedAt: badge.awardedAt || ""
    };
  });
}

exports.getTopRankings = async (req, res) => {
  try {
    const limit = 7;
    const loggedInUserId = req.user.id;

    // Get premium user rankings
    const premiumRankings = await Event.aggregate([
      {
        $group: {
          _id: '$createdBy',
          eventCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      { $match: { 'userInfo.subscription.status': 'active' } },
      { $sort: { eventCount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: { $concat: ['$userInfo.first_name', ' ', '$userInfo.last_name'] },
          profilePicture: '$userInfo.profilePicture',
          eventCount: 1,
          badges: '$userInfo.badges',
        },
      },
    ]);

    // Extract premium user IDs
    const premiumUserIds = premiumRankings.map(u => new mongoose.Types.ObjectId(u.userId));

    // Get non-premium user rankings (excluding premium users)
    const nonPremiumRankings = await Event.aggregate([
      {
        $group: {
          _id: '$createdBy',
          eventCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $match: {
          'userInfo.subscription.status': { $ne: 'active' },
          _id: { $nin: premiumUserIds },
        },
      },
      { $sort: { eventCount: -1 } },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: { $concat: ['$userInfo.first_name', ' ', '$userInfo.last_name'] },
          profilePicture: '$userInfo.profilePicture',
          eventCount: 1,
          badges: '$userInfo.badges',
        },
      },
    ]);

    // Combine and add positions + convert position & eventCount to strings
    const rankedWithPosition = [...premiumRankings, ...nonPremiumRankings].map((user, index) => ({
      position: (index + 1).toString() || '',
      userId: user.userId,
      name: user.name || '',
      profilePicture: user.profilePicture
        ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, '/')}`
        : '',
      eventCount: user.eventCount.toString() || '',
      badges: processBadges(user.badges),
    }));


    // Get the logged-in user's rank
    const userRanking = rankedWithPosition.find(user => user.userId.toString() === loggedInUserId);
    const yourRanking = userRanking ? userRanking.position : '';

    // Get all available badges with descriptions
    const availableBadges = Object.values(BADGES).map(badge => ({
      name: badge.name,
      image: `${process.env.LIVE_URL}${badge.image}`,
      description: badge.description
    }));

    return res.status(200).json({
      status: true,
      message: 'Rankings fetched successfully',
      data: {
        yourRanking: yourRanking.toString() || '',
        badges: availableBadges,
        rankings: rankedWithPosition
      }
    });

  } catch (error) {
    console.error('Error in getTopRankings:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message,
    });
  }
};


exports.getCommunityRankings = async (req, res) => {
  try {
    // No limit, return all community rankings
    const communityRankings = await Event.aggregate([
      {
        $group: {
          _id: '$createdBy',
          eventCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      { $sort: { eventCount: -1 } },
      // Removed $limit to include all users
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: { $concat: ['$userInfo.first_name', ' ', '$userInfo.last_name'] },
          profilePicture: '$userInfo.profilePicture',
          eventCount: 1,
          badges: '$userInfo.badges',
        },
      },
    ]);

    const rankedWithPosition = communityRankings.map((user, index) => ({
      position: (index + 1).toString() || '',
      userId: user.userId,
      name: user.name || '',
      profilePicture: user.profilePicture
        ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, '/')}`
        : '',
      eventCount: user.eventCount.toString() || '',
      badges: processBadges(user.badges),
    }));

    return res.status(200).json({
      status: true,
      message: 'Community rankings fetched successfully',
      data: rankedWithPosition,
    });
  } catch (error) {
    console.error('Error in getCommunityRankings:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
