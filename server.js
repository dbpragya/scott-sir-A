const http = require("http");
const app = require("./src/app");
const { Server } = require("socket.io");
const Group = require("./src/models/Group");
const Message = require("./src/models/Message");
const User = require("./src/models/User");

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // update with your frontend URL in production
    methods: ["GET", "POST"]
  }
});

// Middleware to authenticate socket connection (simplified)
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error("Authentication error: userId required"));
  }
  socket.userId = userId;
  next();
});
io.on("connection", (socket) => {
  // When user joins group
  socket.on("joinGroup", async (groupId) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        socket.emit("errorMessage", "Group not found");
        return;
      }
      if (!group.members.some(m => m.toString() === socket.userId)) {
        socket.emit("errorMessage", "Access denied: not a group member");
        return;
      }
      socket.join(groupId);

      // Fetch user's name to notify others
      const user = await User.findById(socket.userId).select("first_name");
      const userName = user.first_name;

      // Notify only the current user (join confirmation)
      socket.emit("joinedGroup", groupId);

      console.log(`Socket ${socket.id} joined group ${groupId}`);
    } catch (err) {
      socket.emit("errorMessage", "Server error joining group");
    }
  });

  socket.on("sendMessage", async ({ groupId, text }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.members.some(m => m.toString() === socket.userId)) {
        socket.emit("errorMessage", "Not authorized to send messages in this group");
        return;
      }

      // Save message to DB
      const message = await Message.create({
        groupId,
        sender: socket.userId,
        text,
      });

      // Fetch sender details
      const senderUser = await User.findById(socket.userId).select("first_name profilePicture");

      io.to(groupId).emit("newMessage", {
        _id: message._id,
        groupId,
        sender: {
          _id: senderUser._id,
          name: senderUser.first_name,
          profilePicture: senderUser.profilePicture,
        },
        text,
        sentAt: message.sentAt,
      });
    } catch (err) {
      console.error("Send message error:", err);
      socket.emit("errorMessage", "Server error sending message");
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

app.use("/", (req, res) => {
  res.send("Welcome to the server");
});

// Start server listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
});
