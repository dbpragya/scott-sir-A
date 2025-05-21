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

const { createEventValidation } = require("../validators/validation");
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

router.get("/:eventId/share-link", getShareLink);
router.post('/:eventId/vote', authenticateUser, voteOnEvent);

router.get("/", authenticateUser, getAllEvents);
router.get("/:eventId", authenticateUser, getEventById);

router.get('/:eventId/vote-info', authenticateUser, getInvitedEventDetailsForVoting);

router.get('/:eventId/voters', authenticateUser, getVotersByDate);

router.post('/:eventId/finalize', authenticateUser, finalizeEventDate);

module.exports = router;
