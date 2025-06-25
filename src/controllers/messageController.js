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
    const groupId = req.params.groupId;  
    const { text } = req.body;

    if (!groupId || !text) {
      return res.status(400).json({ status: false, message: "Missing groupId or text" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, message: "Group not found" });
    }

    const isMember = group.members.some(m => m.toString() === userId);

    let isEventCreator = false;
    let eventVoted = false;

    if (group.eventId) {
      const event = await Event.findById(group.eventId);
      if (event) {
        if (event.createdBy.toString() === userId) {
          isEventCreator = true;
        }
        eventVoted = event.votes.some(vote => vote.user.toString() === userId);
      } else {
        return res.status(404).json({ status: false, message: "Associated event not found" });
      }
    }

    if (!isMember || (!eventVoted && !isEventCreator)) {
      return res.status(403).json({ status: false, message: "Access denied: You must be a voter in this event to send messages." });
    }

    // Save message to DB
    const message = await Message.create({
      groupId,
      sender: userId,
      text,
    });

    // Populate sender info with 'first_name', 'last_name', and 'profilePicture'
    const senderUser = await User.findById(userId)
      .select("first_name last_name profilePicture");  // Only select the necessary fields

    if (!senderUser) {
      return res.status(404).json({ status: false, message: "Sender user not found" });
    }

    // Create full name from first_name and last_name
    const fullName = `${senderUser.first_name} ${senderUser.last_name}`;

    console.log("Message sent by user:", senderUser._id, "in group:", groupId);
    console.log("Sender user details:", {
      _id: senderUser._id,
      name: fullName,
      profilePicture: senderUser.profilePicture,  // Include profilePicture
    });

    // Emit message to group via socket.io
    const io = req.app.get("io");
    io.to(groupId).emit("newMessage", {
      _id: message._id,
      groupId,
      sender: {
        _id: senderUser._id,
        name: fullName,  // Use full name here
        profilePicture: senderUser.profilePicture,  // Include profilePicture
      },
      text,
      sentAt: message.sentAt,
    });

    // Respond with the full message details
    res.status(201).json({
      status: true,
      message: "Message sent",
      data: {
        _id: message._id,
        groupId,
        sender: {
          _id: senderUser._id,
          name: fullName,  // Full name in the response
          profilePicture: senderUser.profilePicture,  // Profile picture in the response
        },
        text,
        sentAt: message.sentAt,
      }
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};
