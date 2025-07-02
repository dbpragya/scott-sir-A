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
  finalizeEventDate
} = require("../controllers/eventController");

const { createEventValidation, voteOnEventValidation, finalizeEventDateValidation } = require("../validators/validation");
const { validationResult } = require("express-validator");

const authenticateUser = require("../middleware/authmiddleware");

router.post(
  "/create",
  authenticateUser,
  createEventValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg,
      });
    }
    next();
  },
  createEvent
);

router.get('/invite', authenticateUser, handleInviteLink);

router.get("/my-invites", authenticateUser, getInvitedEvents);

router.post("/accept-invite", authenticateUser, AcceptInvite);

router.post('/vote/:eventId', authenticateUser, voteOnEventValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: errors.array()[0].msg,
    });
  }
  next();
}, voteOnEvent);


router.get("/", authenticateUser, getAllEvents);

router.get("/details/:eventId", authenticateUser, getEventById);

router.get('/:eventId/vote-info', authenticateUser, getInvitedEventDetailsForVoting);

router.get('/:eventId/voters', authenticateUser, getVotersByDate);

router.post(
  '/:eventId/finalize',
  authenticateUser,
  finalizeEventDateValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg,
      });
    }
    next();
  },
  finalizeEventDate
);
module.exports = router;
