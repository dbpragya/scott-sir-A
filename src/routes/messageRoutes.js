const express = require("express");
const router = express.Router();
const { getGroupMessages } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authmiddleware");

router.get("/groups/:groupId/messages", authMiddleware, getGroupMessages);

module.exports = router;
