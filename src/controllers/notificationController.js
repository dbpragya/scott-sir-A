const Notification = require('../models/Notifications');

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true,  notifications });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// exports.markNotificationAsRead = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const userId = req.user.id;
//     const notification = await Notification.findOne({ _id: notificationId, userId });

//     if (!notification) {
//       return res.status(404).json({ success: false, message: "Notification not found" });
//     }

//     notification.isRead = true;
//     await notification.save();
//     res.status(200).json({ success: true, message: "Notification marked as read"})

//   } catch (error) {
//     console.error("Mark Notification Error:", error);
//     res.status(500).json({ success: false, message: "Server error"})
//   }
// }