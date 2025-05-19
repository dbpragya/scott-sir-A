const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEventById,
  getShareLink,
  handleInviteLink,
  voteOnEvent,
  getInvitedEvents,
  getInvitedEventDetailsForVoting,
  getVotersByDate,
  finalizeEventDate
} = require("../controllers/eventController");

const authenticateUser = require("../middleware/authmiddleware");

// Event creation
router.post("/create", authenticateUser, createEvent);

// Specific routes first
router.get('/invite', authenticateUser, handleInviteLink);
router.get("/my-invites", authenticateUser, getInvitedEvents); 

// Sharing and voting
router.get("/:eventId/share-link", getShareLink);

module.exports = router;
