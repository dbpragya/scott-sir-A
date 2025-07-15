const Message = require("../models/Message");
const Group = require("../models/Group");
const Event = require("../models/Event");
const User = require("../models/User");

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;  // Get groupId from the URL parameter

    console.log(`User ${req.user.id} requested messages for group ${groupId}`);

    // Validate groupId
    if (!groupId) {
      console.log("Group ID is missing in the request");
      return res.status(400).json({ status: false, message: "Group ID is required" });
    }

    // Find all messages for the group (using groupId)
    const messages = await Message.find({ groupId }).populate('sender', 'first_name last_name profilePicture').sort({ sentAt: 1 });

    if (!messages) {
      console.log(`No messages found for group ${groupId}`);
      return res.status(404).json({ status: false, message: "No messages found for this group" });
    }

    const baseUrl = process.env.LIVE_URL || 'http://localhost:3000'; 
    const updatedMessages = messages.map(message => {
      if (message.sender && message.sender.profilePicture) {
        message.sender.profilePicture = `${baseUrl}/${message.sender.profilePicture}`;
      }
      return message;
    });

    return res.status(200).json({
      status: true,
      message: "Messages retrieved successfully",
      data: updatedMessages,
    });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ status: false, message: "Failed to retrieve messages" });
  }
};


exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    const { text } = req.body;

    console.log(`User ${userId} triggered sendMessage API for group ${groupId} with text: "${text}"`);

    // Validate inputs
    if (!groupId || !text) {
      console.log("Missing groupId or text in the request body");
      return res.status(400).json({ status: false, message: "Missing groupId or text" });
    }

    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      console.log(`Group not found with groupId: ${groupId}`);
      return res.status(404).json({ status: false, message: "Group not found" });
    }

    console.log(`Group found: ${groupId} with members: ${group.members.length} members`);

    // Check if user is a member of the group
    const isMember = group.members.some(m => m.user.toString() === userId);
    console.log(`User ${userId} is ${isMember ? "a member" : "not a member"} of group ${groupId}`);

    let isEventCreator = false;
    let eventVoted = false;

    // Check the event associated with the group
    if (group.eventId) {
      console.log(`Checking event associated with group ${groupId}...`);
      const event = await Event.findById(group.eventId);
      if (event) {
        if (event.createdBy.toString() === userId) {
          isEventCreator = true;
          console.log(`User ${userId} is the event creator of event ${event._id}`);
        }
        eventVoted = event.votes.some(vote => vote.user.toString() === userId);
        console.log(`User ${userId} has ${eventVoted ? "voted" : "not voted"} in event ${event._id}`);
      } else {
        console.log(`Associated event not found with eventId: ${group.eventId}`);
        return res.status(404).json({ status: false, message: "Associated event not found" });
      }
    }

    // Validate if the user is either a member of the group or a voter/event creator
    if (!isMember && !isEventCreator && !eventVoted) {
      console.log(`User ${userId} is not authorized to send a message in group ${groupId}`);
      return res.status(403).json({ status: false, message: "Access denied: You must be a voter in this event or a group member to send messages." });
    }

    // Save the message in the database
    const message = await Message.create({
      groupId,
      sender: userId,
      text,
    });
    console.log(`Message created in DB: ${message._id}`);

    // Populate the sender's information (full name and profile picture)
    const senderUser = await User.findById(userId).select("first_name last_name profilePicture");

    if (!senderUser) {
      console.log(`Sender user not found with userId: ${userId}`);
      return res.status(404).json({ status: false, message: "Sender user not found" });
    }

    // Create full name from first_name and last_name
    const fullName = `${senderUser.first_name} ${senderUser.last_name}`;
    console.log(`Sender user details:`, {
      _id: senderUser._id,
      name: fullName,
      profilePicture: senderUser.profilePicture,
    });

    // Get the socket.io instance
    const io = req.app.get("io");

    // Emit message to the group only if the user is connected to the group
    io.to(groupId).emit("newMessage", {
      _id: message._id,
      groupId,
      sender: {
        _id: senderUser._id,
        name: fullName,
        profilePicture: senderUser.profilePicture,
      },
      text,
      sentAt: message.sentAt,
    });
    console.log(`Message successfully emitted to group ${groupId}`);

    // Respond with the full message details
    res.status(201).json({
      status: true,
      message: "Message sent",
      data: {
        _id: message._id,
        groupId,
        sender: {
          _id: senderUser._id,
          name: fullName,
          profilePicture: senderUser.profilePicture,
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
