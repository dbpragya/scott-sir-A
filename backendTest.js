const { io } = require("socket.io-client");
const readline = require("readline");

const socket = io("http://192.168.1.25:5000", {
  auth: {
    userId: "686ccd49c14988f9cbdb543d", // Your user ID
  },
  transports: ["websocket"],
});

const groupId = "685bf5d97af9b225ee43cf90"; // Your group ID

socket.on("connect", () => {
  console.log("✅ Connected to socket server");
  
  // Join group only once
  socket.emit("joinGroup", groupId);
});

socket.on("joinedGroup", (groupId) => {
  console.log("✅ Joined group:", groupId);
  console.log("💬 Type your message below and press Enter:");
});

socket.on("disconnect", () => {
  console.log("🚫 Disconnected from socket server");
});

// Use readline to send message manually
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", (input) => {
  socket.emit("sendMessage", {
    groupId,
    text: input,
  });
});
