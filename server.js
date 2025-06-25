const http = require("http");
const app = require("./src/app");
const { Server } = require("socket.io");
const Group = require("./src/models/Group");
const Message = require("./src/models/Message");
const User = require("./src/models/User");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error("Authentication error: userId required"));
  }
  socket.userId = userId;
  next();
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id} (User ${socket.userId})`);

  socket.on("joinGroup", async (groupId) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        socket.emit("errorMessage", "Group not found");
        return;
      }
      if (!group.members.some((m) => m.toString() === socket.userId)) {
        socket.emit("errorMessage", "Access denied: not a group member");
        return;
      }
      socket.join(groupId);
      socket.emit("joinedGroup", groupId);
      console.log(`User ${socket.userId} joined group ${groupId}`);
    } catch (err) {
      socket.emit("errorMessage", "Server error joining group");
    }
  });

  socket.on("sendMessage", async ({ groupId, text }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === socket.userId)) {
        socket.emit("errorMessage", "Not authorized to send message in this group");
        return;
      }

      const message = await Message.create({
        groupId,
        sender: socket.userId,
        text,
      });

      const senderUser = await User.findById(socket.userId).select("name avatar");

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
    } catch (err) {
      socket.emit("errorMessage", "Server error sending message");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
});