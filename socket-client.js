const axios = require("axios");
const { io } = require("socket.io-client");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";
const API_URL = process.env.API_URL || "http://localhost:5000/api";

async function fetchUsers() {
  try {
    const { data } = await axios.get(`${API_URL}/users`);
    // Expect data.users = [{ userId, token }]
    return data.users;
  } catch (err) {
    console.error("Failed to fetch users:", err.message);
    return [];
  }
}

async function fetchGroupsForUser(userId) {
  try {
    const { data } = await axios.get(`${API_URL}/users/${userId}/groups`);
    return data.groups;
  } catch (err) {
    console.error(`Failed to fetch groups for user ${userId}:`, err.message);
    return [];
  }
}

function createClient(user) {
  const socket = io(SERVER_URL, {
    auth: {
      userId: user.userId,
      token: user.token,
    },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    timeout: 20000,
  });

  socket.on("connect", () => {

    user.groups.forEach((groupId) => {
      socket.emit("joinGroup", groupId);
    });

  });

  socket.on("joinedGroup", (groupId) => {
    console.log(`[${user.userId}] Successfully joined group: ${groupId}`);
  });

  socket.on("newMessage", (message) => {
    const senderName = message.sender?.name || message.sender || "Unknown";
  });

  socket.on("errorMessage", (err) => {
    console.error(`[${user.userId}] Error:`, err);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[${user.userId}] Disconnected. Reason: ${reason}`);
  });

  socket.on("connect_error", (err) => {
    console.error(`[${user.userId}] Connection error: ${err.message}`);
  });

  return socket;
}

async function main() {
  const users = await fetchUsers();
  if (!users.length) {
    console.error("No users found. Exiting.");
    return;
  }

  for (const user of users) {
    user.groups = await fetchGroupsForUser(user.userId);
    createClient(user);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
});
