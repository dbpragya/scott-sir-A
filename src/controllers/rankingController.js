const Event = require('../models/Event');
const mongoose = require('mongoose');

exports.getTopRankings = async (req, res) => {
  try {
    const limit = 7;
    const loggedInUserId = req.user.id; 

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

    const premiumUserIds = premiumRankings.map(u => new mongoose.Types.ObjectId(u.userId));

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

    const combinedRankings = [...premiumRankings, ...nonPremiumRankings];
    const rankedWithPosition = combinedRankings.map((user, index) => ({
      position: index + 1,
      ...user,
    }));

    const userRanking = rankedWithPosition.find(user => user.userId.toString() === loggedInUserId);
    const yourRanking = userRanking ? userRanking.position : [];

    return res.json({
      success: true,
      yourRanking: yourRanking,
      rankings: rankedWithPosition,
    });
  } catch (error) {
    console.error('Error in getTopRankings:', error);
    return res.success(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
