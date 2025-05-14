const express = require("express");
const router = express.Router();
const {createEvent, getAllEvents, getEventById, getShareLink } = require("../controllers/eventController");
const authenticateUser = require("../middleware/authmiddleware")

router.post("/create", authenticateUser, createEvent);
router.get("/", authenticateUser, getAllEvents);
router.get("/:eventId", getEventById);
router.get("/:eventId/share-link", getShareLink);

module.exports = router;
