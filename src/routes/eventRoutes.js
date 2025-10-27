const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEventById,
  AcceptInvite,
  handleInviteLink,
  voteOnEvent,
  getInvitedEvents,
  getInvitedEventDetailsForVoting,
  getVotersByDate,
  finalizeEventDate,
  updateEvent,
  deleteEvent
} = require("../controllers/eventController");

const { createEventValidation, voteOnEventValidation, finalizeEventDateValidation } = require("../validators/validation");
const { validationResult } = require("express-validator");
const authenticateUser = require("../middleware/authmiddleware");

router.post( "/create",authenticateUser,createEventValidation,createEvent);
router.get('/invite', authenticateUser, handleInviteLink);
router.get("/my-invites", authenticateUser, getInvitedEvents);
router.post("/accept-invite", authenticateUser, AcceptInvite);
router.post('/vote/:eventId', authenticateUser, voteOnEventValidation,voteOnEvent);
router.get("/", authenticateUser, getAllEvents);
router.get("/:eventId", authenticateUser, getEventById); // phase-2
router.get("/details/:eventId", authenticateUser, getEventById); 

router.put("/:eventId", authenticateUser, updateEvent); // phase-2
router.delete("/:eventId", authenticateUser, deleteEvent); // phase-2

router.get('/vote-info/:eventId', authenticateUser, getInvitedEventDetailsForVoting);

router.get('/voters/:eventId', authenticateUser, getVotersByDate);

router.post(
  '/finalize/:eventId', authenticateUser, finalizeEventDate
);
module.exports = router;
