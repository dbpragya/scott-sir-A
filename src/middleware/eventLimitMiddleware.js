const Event = require('../models/Event');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');

module.exports = async function checkMonthlyEventLimit(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found.' });
    }
    const subscription = user.subscription;
    // Free user branch
    if (!subscription || !subscription.planId || subscription.status === 'none' || subscription.status === undefined) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const eventCountThisMonth = await Event.countDocuments({
        createdBy: userId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      if (eventCountThisMonth >= 1) {
        return res.status(403).json({
          status: false,
          message: 'You’ve hit your event limit for this month. Upgrade your plan to create more events.',
        });
      }
      req.plan = undefined;
      req.subscription = subscription;
      return next();
    }
    // Paid user branch
    let plan = null;
    if (subscription && subscription.planId) {
      plan = await SubscriptionPlan.findById(subscription.planId).select('duration eventLimit name');
      if (!plan) {
        return res.status(400).json({ status: false, message: 'Subscription plan not found.' });
      }
      // Expiry check
      if (subscription.expiryDate && new Date(subscription.expiryDate) <= new Date()) {
        return res.status(403).json({ status: false, message: 'Your subscription has expired. Please renew.' });
      }
      // Lifetime plan: enforce max events
      if (plan.duration === 'lifetime') {
        const limit = typeof plan.eventLimit === 'number' ? plan.eventLimit : 3;
        const used = subscription.eventsCreated || 0;
        if (used >= limit) {
          return res.status(400).json({ status: false, message: `Event limit reached for your current plan. Please upgrade to create more events.` });
        }
      }
      // For time plans (month/year): unlimited while active, only need expiry check
    }
    req.plan = plan;
    req.subscription = subscription;
    return next();
  } catch (err) {
    console.error('Event limit middleware error:', err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
}
