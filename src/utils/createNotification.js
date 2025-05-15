const Notification = require('../models/Notifications');

async function createNotification(userId, title, message) {
  try {
    const notification = new Notification({ userId, title, message });
    await notification.save();
    console.log(`Notification created for user ${userId}`);
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

module.exports = createNotification;
