const express = require("express");
const router = express.Router();
const { getGroupMessages, sendMessage } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authmiddleware");

router.get("/groups/:groupId", authMiddleware, getGroupMessages);
router.post("/groups/:groupId", authMiddleware, sendMessage);

module.exports = router;