const io = require("socket.io-client");

// Connect to the Socket.IO server (the same address as the backend server)
const socket = io("http://localhost:5000", {
  auth: { userId: "685d2895050256b25d2226b2" },  // Example userId for authentication
});

// Listen for successful connection
socket.on("connect", () => {
  console.log("Connected to the server");

  // Emit the 'joinGroup' event with a groupId to join the group (use a real groupId here)
  const groupId = "6870f4399a5884b83442add8";  // Replace with an actual groupId from your DB
  socket.emit("joinGroup", groupId);

  // Send a test message to the group
  socket.emit("sendMessage", { groupId, text: "Hello from the backend test!" });
});

// Listen for the 'newMessage' event from the server
socket.on("newMessage", (message) => {
  console.log("New message received:", message);
});

// Listen for successful group join
socket.on("joinedGroup", (groupId) => {
  console.log(`Successfully joined group ${groupId}`);
});

// Handle errors
socket.on("errorMessage", (error) => {
  console.error("Error:", error);
});
