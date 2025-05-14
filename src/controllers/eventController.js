const Event = require("../models/Event");

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