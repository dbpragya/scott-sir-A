const Message = require("../models/Message");
const Group = require("../models/Group");
const Event = require("../models/Event");

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, message: "Group not found" });
    }

    const isMember = group.members.some(m => m.toString() === userId);

    let isEventCreator = false;
    if (group.eventId) {
      const event = await Event.findById(group.eventId);
      if (event && event.createdBy.toString() === userId) {
        isEventCreator = true;
      }
    }

    if (!isMember && !isEventCreator) {
      return res.status(403).json({ status: false, message: "Access denied" });
    }

    const messages = await Message.find({ groupId })
      .sort({ sentAt: 1 })
      .populate("sender", "name avatar");

    res.json({ status: true, messages });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};
