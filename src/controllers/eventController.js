const Event = require("../models/Event");
const jwt = require('jsonwebtoken');

exports.createEvent = async (req, res) => {
  try {
    // Extract required fields from request body
    const { name, location, description, votingTime, theme, dates } = req.body;

    // Check for missing required fields
    if (!name || !votingTime || !theme || !dates || dates.length === 0) {
      return res.status(400).json({ status: false, message: "Missing required fields" });
    }

    // Get the authenticated user's ID from the request object (assuming it's set by authentication middleware)
    const userId = req.user.id;

    // Create a new event with the userId (assuming 'createdBy' is the field in your Event model)
    const newEvent = new Event({
      name,
      location,
      description,
      votingTime,
      theme,
      dates,
      type: "Planned",
      createdBy: userId,  // Associate the event with the authenticated user
    });

    // Save the event to the database
    await newEvent.save();

    // Respond with a success message
    res.status(201).json({ status: true, message: "Event created successfully", event: newEvent });

  } catch (error) {
    console.error("Create Event Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


exports.getAllEvents = async (req, res) => {
  try {
    // Get the authenticated user's ID from the request object (set by the authentication middleware)
    const userId = req.user.id;

    // Fetch only events created by the authenticated user
    const events = await Event.find({ type: "Planned", createdBy: userId }).sort({ createdAt: -1 });

    const modifiedEvents = events.map(event => ({
      ...event.toObject(),
      votedCount: 10,     
      invitedCount: 16    
    }));

    res.status(200).json({ status: true, events: modifiedEvents });
  } catch (error) {
    console.error("Get Events Error:", error);
    res.status(500).json({ status: false, message: "Failed to fetch events" });
  }
};

// need to update this - to add the authenticated user and many more
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.status(200).json({ event });
  } catch (error) {
    console.error("Get Event Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getShareLink = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const shareLink = `https://MakeitHappen.com/invite?eventId=${eventId}`;

    res.status(200).json({ link: shareLink });
  } catch (error) {
    console.error("Get Share Link Error:", error);
    res.status(500).json({ message: "Failed to generate share link" });
  }
};

// route: GET /invite -need to be updated - the person 
exports.handleInviteLink = async (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ message: "Missing event ID" });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check for token
    const token = req.headers.authorization?.split(" ")[1];


    if (!token) {
      return res.status(401).json({
        message: "Please login/signup to view the event",
        redirectTo: `/signup?redirect=/invite?eventId=${eventId}`,
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({ message: "Invalid token", error: err.message });
    }

    // Send event details
    res.status(200).json({ status: true, event });

  } catch (err) {
    console.error("Invite Link Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.voteOnEvent = async (req, res) => {
  const { eventId } = req.params;
  const { selectedDate } = req.body;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const alreadyVoted = event.votes.some(
      vote => vote.user.toString() === req.user.id
    );

    if (alreadyVoted) {
      return res.status(400).json({ message: "You already voted" });
    }

    // Add vote
    event.votes.push({ user: req.user.id, date: selectedDate });

    // Add user to invitedUsers if not already there
    if (!event.invitedUsers.some(u => u.toString() === req.user.id)) {
      event.invitedUsers.push(req.user.id);
    }

    await event.save();

    res.status(200).json({ message: "Vote submitted" });

  } catch (err) {
    console.error("Vote Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvitedEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Looking for events where user is invited or has voted:", userId);

    // Find events where the user is either invited or has voted on the event
    const events = await Event.find({
      $or: [
        { invitedUsers: userId },  // User is invited
        { "votes.user": userId }    // User has voted
      ]
    });

    // Check if events are found
    if (events.length === 0) {
      console.log("No invited/voted events found for user.");
      return res.status(404).json({ message: "No invited or voted events found for the user." });
    }

    // Respond with the list of events
    res.status(200).json({ events });

  } catch (error) {
    console.error("Get Invited Events Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
