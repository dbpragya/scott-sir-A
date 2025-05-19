const Event = require("../models/Event");
const jwt = require('jsonwebtoken');

exports.createEvent = async (req, res) => {
  try {
    const { name, location, description, votingTime, theme, dates } = req.body;

    if (!name || !votingTime || !theme || !dates || dates.length === 0) {
      return res.status(400).json({ status: false, message: "Missing required fields" });
    }

    const userId = req.user.id;

    const newEvent = new Event({
      name,
      location,
      description,
      votingTime,
      theme,
      dates,
      type: "Planned",
      createdBy: userId,  
    });

    await newEvent.save();

    res.status(201).json({ status: true, message: "Event created successfully", event: newEvent });

  } catch (error) {
    console.error("Create Event Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


exports.getAllEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const events = await Event.find({ type: "Planned", createdBy: userId })
      .sort({ createdAt: -1 })
      .populate({ path: "createdBy", select: "profilePicture" }) 
      .populate({ path: "votes.user", select: "profilePicture" });

    const modifiedEvents = events.map(event => ({
      name: event.name,
      location: event.location,
      description: event.description,
      creatorProfilePicture: event.createdBy?.profilePicture || null,
      voteCount: event.votes.length,
      votersProfilePictures: event.votes.map(vote => vote.user?.profilePicture || null),
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
    const event = await Event.findById(req.params.eventId)
      .populate({ path: 'invitedUsers', select: 'profilePicture' })
      .populate({ path: 'votes.user', select: 'profilePicture' })
      .populate({ path: 'createdBy', select: 'first_name' });

    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found" });
    }

    if (!event.createdBy || event.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ status: false, message: "Access denied. Only event creator can view this event." });
    }

    const formatWeekdayDate = (dateStr) => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const d = new Date(dateStr);
      const weekday = days[d.getUTCDay()]; 

      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0'); 
      const day = String(d.getUTCDate()).padStart(2, '0');

      return `${weekday} ${year}-${month}-${day}`;
    };

    let remainingTimeMs = 0;
    let remainingTimeText = "Voting ended";

    if (event.votingTime && event.createdAt) {
      const match = event.votingTime.match(/^(\d+)\s*hrs?$/i);
      if (match) {
        const hoursAllowed = parseInt(match[1], 10);
        const votingEnd = new Date(event.createdAt.getTime() + hoursAllowed * 60 * 60 * 1000);
        const now = new Date();
        remainingTimeMs = votingEnd - now > 0 ? votingEnd - now : 0;

        if (remainingTimeMs > 0) {
          const hoursRemaining = Math.floor(remainingTimeMs / (1000 * 60 * 60));
          const minutesRemaining = Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hoursRemaining > 0) {
            remainingTimeText = `${hoursRemaining} hour${hoursRemaining > 1 ? "s" : ""} remaining`;
            if (minutesRemaining > 0) {
              remainingTimeText += ` ${minutesRemaining} minute${minutesRemaining > 1 ? "s" : ""}`;
            }
          } else if (minutesRemaining > 0) {
            remainingTimeText = `${minutesRemaining} minute${minutesRemaining > 1 ? "s" : ""} remaining`;
          } else {
            remainingTimeText = "Less than a minute remaining";
          }
        }
      }
    }

    const votesByDateMap = {};
    event.votes.forEach(vote => {
      if (!vote.date) return;
      const voteDateStr = new Date(vote.date).toISOString().split('T')[0];
      if (!votesByDateMap[voteDateStr]) {
        votesByDateMap[voteDateStr] = {
          count: 0,
          votersProfilePictures: []
        };
      }
      votesByDateMap[voteDateStr].count++;
      if (vote.user && vote.user.profilePicture) {
        votesByDateMap[voteDateStr].votersProfilePictures.push(vote.user.profilePicture);
      }
    });

    const datesWithVotes = event.dates.map(d => {
      const eventDateStr = new Date(d.date).toISOString().split('T')[0];
      return {
        date: formatWeekdayDate(d.date),  
        timeSlot: d.timeSlot,
        voteCount: votesByDateMap[eventDateStr]?.count || 0,
        votersProfilePictures: votesByDateMap[eventDateStr]?.votersProfilePictures || [],
      };
    });

    const invitedUsersProfilePics = event.invitedUsers.map(u => u.profilePicture || null);

    const eventDetails = {
      name: event.name,
      location: event.location,
      description: event.description,
      theme: event.theme,
      invitedUsersCount: event.invitedUsers.length,
      invitedUsersProfilePics,
      remainingVotingTime: remainingTimeText,
      dates: datesWithVotes,
    };

    res.status(200).json({ status: true, event: eventDetails });
  } catch (error) {
    console.error("Get Event Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

exports.getShareLink = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found" });
    }

    const shareLink = `https://oyster-app-g2hmu.ondigitalocean.app/api/events/invite?eventId=${eventId}`;

    res.status(200).json({ link: shareLink });
  } catch (error) {
    console.error("Get Share Link Error:", error);
    res.status(500).json({ status: false, message: "Failed to generate share link" });
  }
};