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
router.post('/:eventId/vote', authenticateUser, voteOnEvent);

// General
router.get("/", authenticateUser, getAllEvents);
router.get("/:eventId", authenticateUser, getEventById);

router.get('/:eventId/vote-info', authenticateUser, getInvitedEventDetailsForVoting);

router.get('/:eventId/voters', authenticateUser, getVotersByDate);

router.post('/:eventId/finalize', authenticateUser, finalizeEventDate);


module.exports = router;
