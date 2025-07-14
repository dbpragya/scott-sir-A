const socketIo = require('socket.io');
const Group = require("../models/Group");
const Message = require("../models/Message");
const User = require('../models/User');

const socketHandler = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"],
      credentials: true
    },
    transports: ["websocket"],
  });


  io.use((socket, next) => {
    // const userId = socket.handshake.auth.userId;
    const userId = socket.handshake.headers['userid']; 
    if (!userId) {
      return next(new Error("Authentication error: userId required"));
    }
    socket.userId = userId;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);
    next();
  });

  io.on("connection", (socket) => {
    socket.on("joinGroup", async (groupId) => {
      try {
        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit("errorMessage", "Group not found");
          console.log(`Group not found for groupId: ${groupId}`);
          return;
        }

        if (!group.members.some((m) => m.$oid.toString() === socket.userId)) {
          socket.emit("errorMessage", "Access denied: not a group member");
          return;
        }

        socket.join(groupId);
        socket.emit("joinedGroup", groupId);
        console.log(`User ${socket.userId} joined group ${groupId}`);
      } catch (err) {
        socket.emit("errorMessage", "Server error joining group");
        console.error("Error joining group:", err);
      }
    });

    socket.on("sendMessage", async ({ groupId, text }) => {
      try {
        console.log(`User ${socket.userId} sending message to group ${groupId}`);

        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit("errorMessage", "Group not found");
          console.log(`Group not found for groupId: ${groupId}`);
          return;
        }

        const isMember = group.members.some((m) => m.$oid.toString() === socket.userId);
        if (!isMember) {
          socket.emit("errorMessage", "Not authorized to send message in this group");
          console.log(`User ${socket.userId} is not authorized to send message in group ${groupId}`);
          return;
        }

        const message = await Message.create({
          groupId,
          sender: socket.userId,
          text,
        });

        const senderUser = await User.findById(socket.userId).select("first_name last_name profilePicture");

        if (!senderUser) {
          socket.emit("errorMessage", "Sender user not found");
          console.log(`Sender user not found for userId: ${socket.userId}`);
          return;
        }

        const fullName = `${senderUser.first_name} ${senderUser.last_name}`;
        console.log(`Sender user details:`, {
          _id: senderUser._id,
          name: fullName,
          profilePicture: senderUser.profilePicture,
        });

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

        console.log(`Message emitted to group ${groupId} by user ${socket.userId}`);
      } catch (err) {
        socket.emit("errorMessage", "Server error sending message");
        console.error("Error sending message:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;