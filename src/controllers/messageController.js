const Message = require("../models/Message");
const Group = require("../models/Group");
const Event = require("../models/Event");
const User = require("../models/User");

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
      return res.status(403).json({ status: false, message: "You are not the member of this group" });
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

exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;  // get groupId from URL param
    const { text } = req.body;

    if (!groupId || !text) {
      return res.status(400).json({ status: false, message: "Missing groupId or text" });
    }

    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, message: "Group not found" });
    }

    // Check if user is member of the group
    const isMember = group.members.some(m => m.toString() === userId);

    // Check event creator flag
    let isEventCreator = false;
    let eventVoted = false;

    if (group.eventId) {
      const event = await Event.findById(group.eventId);
      if (event) {
        // Is user the creator?
        if (event.createdBy.toString() === userId) {
          isEventCreator = true;
        }
        // Has user voted on the event?
        eventVoted = event.votes.some(vote => vote.user.toString() === userId);
      } else {
        return res.status(404).json({ status: false, message: "Associated event not found" });
      }
    }

    // Only allow if user is member AND (voted OR is event creator)
    if (!isMember || (!eventVoted && !isEventCreator)) {
      return res.status(403).json({ status: false, message: "Access denied: You must be a voter in this event to send messages." });
    }

    // Save message to DB
    const message = await Message.create({
      groupId,
      sender: userId,
      text,
    });

    // Populate sender info
    const senderUser = await User.findById(userId).select("name avatar");

    if (!senderUser) {
      return res.status(404).json({ status: false, message: "Sender user not found" });
    }

    // Emit message to group via socket.io
    const io = req.app.get("io");
    io.to(groupId).emit("newMessage", {
      _id: message._id,
      groupId,
      sender: {
        _id: senderUser._id,
        name: senderUser.name,
        avatar: senderUser.avatar,
      },
      text,
      sentAt: message.sentAt,
    });

    res.status(201).json({ status: true, message: "Message sent", data: message });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};
