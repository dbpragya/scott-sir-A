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


exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate({ path: 'invitedUsers', select: 'profilePicture' })
      .populate({ path: 'votes.user', select: 'profilePicture' })
      .populate({ path: 'createdBy', select: 'first_name' });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.createdBy || event.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. Only event creator can view this event." });
    }

    // Helper to format date as "Weekday YYYY-MM-DD"
    const formatWeekdayDate = (dateStr) => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const d = new Date(dateStr);
      const weekday = days[d.getUTCDay()]; // use getUTCDay for UTC consistency

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
        date: formatWeekdayDate(d.date),  // formatted with weekday, no time
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

    const shareLink = `http://localhost:5000/api/events/invite?eventId=${eventId}`;

    res.status(200).json({ link: shareLink });
  } catch (error) {
    console.error("Get Share Link Error:", error);
    res.status(500).json({ message: "Failed to generate share link" });
  }
};

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

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({ message: "Invalid token", error: err.message });
    }

    const userId = req.user.id;

    if (event.createdBy.toString() === userId) {
      return res.status(403).json({ message: "Event creator cannot access this invite link." });
    }

    if (!event.invitedUsers.some(u => u.toString() === userId)) {
      event.invitedUsers.push(userId);
      await event.save();
    }

    res.status(200).json({ status: true, event });

  } catch (err) {
    console.error("Invite Link Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvitedEventDetailsForVoting = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate({ path: 'createdBy', select: 'first_name profilePicture' })
      .populate({ path: 'invitedUsers', select: 'profilePicture' });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Deny access if current user is event creator
    if (event.createdBy._id.toString() === req.user.id) {
      return res.status(403).json({ message: "Event creator cannot access this voting details." });
    }

    const getFormattedDate = (dateStr) => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dateObj = new Date(dateStr);
      const weekday = days[dateObj.getDay()];

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0'); 
      const day = String(dateObj.getDate()).padStart(2, '0');

      return `${weekday} ${year}-${month}-${day}`;
    };

    const datesWithFormattedDate = event.dates.map(dateObj => ({
      date: getFormattedDate(dateObj.date),
      timeSlot: dateObj.timeSlot,
    }));

    const invitedUsersProfilePics = event.invitedUsers.map(user => user.profilePicture || null);

    const eventDetails = {
      name: event.name,
      location: event.location,
      description: event.description,
      creator: {
        name: event.createdBy?.first_name || "Unknown",
        profilePicture: event.createdBy?.profilePicture || null,
      },
      dates: datesWithFormattedDate,
      invitedUsersCount: event.invitedUsers.length,
      invitedUsersProfilePics,
    };

    res.status(200).json({ status: true, event: eventDetails });
  } catch (error) {
    console.error("Get Event Details For Voting Error:", error);
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

    if (event.createdBy.toString() === req.user.id) {
      return res.status(403).json({ message: "Event creator cannot vote for their own event." });
    }

    if (!selectedDate) {
      return res.status(400).json({ message: "Please select a date to vote." });
    }

const validDateObj = event.dates.find(d => new Date(d.date).toISOString() === new Date(selectedDate).toISOString());
if (!validDateObj) {
  return res.status(400).json({ message: "Selected date is not valid for this event." });
}
console.log("hello")
console.log("Valid date object found:", validDateObj);


    const alreadyVoted = event.votes.some(
      vote => vote.user.toString() === req.user.id
    );

    if (alreadyVoted) {
      return res.status(400).json({ message: "You already voted" });
    }

    event.votes.push({ user: req.user.id, date: selectedDate });

    if (!event.invitedUsers.some(u => u.toString() === req.user.id)) {
      event.invitedUsers.push(req.user.id);
    }

    await event.save();

    res.status(200).json({ message: "Vote submitted", voteCount: event.votes.length });

  } catch (err) {
    console.error("Vote Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



exports.getInvitedEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const events = await Event.find({ invitedUsers: userId })
      .populate({
        path: "createdBy",
        select: "first_name profilePicture",
      });

    if (events.length === 0) {
      console.log("No invited events found for user.");
      return res.status(404).json({ message: "No invited events found for the user." });
    }

    const simplifiedEvents = events.map(event => ({
      name: event.name,
      location: event.location,
      plannerName: event.createdBy?.first_name || 'Unknown',
      plannerProfilePicture: event.createdBy?.profilePicture || null,
    }));

    res.status(200).json({ events: simplifiedEvents });
  } catch (error) {
    console.error("Get Invited Events Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};