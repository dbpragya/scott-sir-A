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
  EditEvent,
  updateEvent,
  deleteEvent,
  getPublicEvents,
  getPublicEventDetails,
  shareEvent,
  shareEventUser
} = require("../controllers/eventController");

const { createEventValidation, voteOnEventValidation, finalizeEventDateValidation } = require("../validators/validation");
const { validationResult } = require("express-validator");
const authenticateUser = require("../middleware/authmiddleware");

router.post( "/create",authenticateUser,createEventValidation,createEvent);
router.get('/invite', authenticateUser, handleInviteLink);

router.post("/accept-invite", authenticateUser, AcceptInvite);
router.post('/vote/:eventId', authenticateUser, voteOnEventValidation,voteOnEvent);

router.get("/", authenticateUser, getAllEvents);
router.get("/details/:eventId", authenticateUser, getEventById);
router.get("/my-invites", authenticateUser, getInvitedEvents);

router.get("/public-events", authenticateUser, getPublicEvents);
router.get("/public-events-details/:eventId", authenticateUser, getPublicEventDetails);


// router.get("/:eventId", authenticateUser, getEventById); 

router.get("/:eventId", authenticateUser, EditEvent); // phase-2
router.put("/:eventId", authenticateUser, updateEvent); // phase-2
router.delete("/:eventId", authenticateUser, deleteEvent); // phase-2

router.get('/vote-info/:eventId', authenticateUser, getInvitedEventDetailsForVoting);
router.get('/voters/:eventId', authenticateUser, getVotersByDate);

router.post('/finalize/:eventId', authenticateUser, finalizeEventDate); // vote giving
router.get('/share-event/:eventId', authenticateUser, shareEvent);
router.put('/share-event-user/:eventId', authenticateUser, shareEventUser);
module.exports = router;
