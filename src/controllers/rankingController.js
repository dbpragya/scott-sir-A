const Event = require('../models/Event');
const mongoose = require('mongoose');


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
        },
      },
    ]);

   // Combine and add positions + convert position & eventCount to strings
const rankedWithPosition = [...premiumRankings, ...nonPremiumRankings].map((user, index) => ({
  position: (index + 1).toString() || '',
  ...user,
  eventCount: user.eventCount.toString() || '',
  profilePicture: user.profilePicture
    ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, '/')}`
    : '',
}));


    // Get the logged-in user's rank
    const userRanking = rankedWithPosition.find(user => user.userId.toString() === loggedInUserId);
    const yourRanking = userRanking ? userRanking.position : '';

    return res.status(200).json({
      status: true,
      message: 'Rankings fetched successfully',
      data: {
      yourRanking: yourRanking.toString() || '',
      rankings: rankedWithPosition,
      
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
