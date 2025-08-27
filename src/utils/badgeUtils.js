const User = require('../models/User');
const Event = require('../models/Event');
const BADGES = require('../constants/badges');

async function awardBadge(userId, badge) {
  const user = await User.findById(userId);
  if (!user) return;

  // Prevent duplicate badge
  if (!user.badges.some(b => b.name === badge.name)) {
    user.badges.push({
      name: badge.name,
      image: badge.image
    });
    await user.save();
  }
}

async function checkSpeedyVoterBadge(userId) {
  const count = await Event.countDocuments({ 'votes.0.user': userId });
  if (count >= 3) {
    await awardBadge(userId, BADGES.SPEEDY_VOTER);
  }
}

async function checkTopPlannerBadge(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const count = await Event.countDocuments({
    createdBy: userId,
    createdAt: { $gte: thirtyDaysAgo }
  });

  if (count >= 3) {
    await awardBadge(userId, BADGES.TOP_PLANNER);
  }
}

async function checkMostPopularBadge(userId) {
  const events = await Event.find({ createdBy: userId });
  let totalInvites = 0;
  for (const event of events) totalInvites += event.invitedUsers.length;

  if (totalInvites >= 20) {
    await awardBadge(userId, BADGES.MOST_POPULAR);
  }
}

module.exports = {
  awardBadge,
  checkSpeedyVoterBadge,
  checkTopPlannerBadge,
  checkMostPopularBadge,
};
