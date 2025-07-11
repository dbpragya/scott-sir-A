const http = require("http");
const express = require('express');
const app = require("./src/app");
const { Server } = require("socket.io");
const Group = require("./src/models/Group");
const Message = require("./src/models/Message");
const User = require("./src/models/User");
const socketHandler = require('./src/utils/socketHandler');  // Corrected import

const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = require('socket.io')(server, {
  cors: {
    origin: "*",  // Adjust for production as needed
    methods: ["GET", "POST"],
  },
});

// Make io available to other parts of the app
app.set("io", io);

// Use socketHandler to handle Socket.IO connections
socketHandler(server);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
