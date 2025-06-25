const Event = require("../models/Event");
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { checkTopPlannerBadge } = require('../utils/badgeUtils');
const { checkSpeedyVoterBadge } = require('../utils/badgeUtils');
const Group = require("../models/Group");
const createNotification = require('../utils/createNotification');
const { validationResult } = require("express-validator");

// Validation Done
exports.createEvent = async (req, res) => {
  try {
    const { name, location, description, votingTime, dates, invitationCustomization } = req.body;    
    const userId = req.user.id;

    if(!name || !location || !description || !votingTime || !dates) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found for ID:", userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const now = new Date();
    const subscription = user.subscription;
    const hasPremium = subscription &&
      subscription.status === 'active' &&
      new Date(subscription.expiryDate) > now;

    if (!hasPremium) {
      const existingEventsCount = await Event.countDocuments({ createdBy: userId });

      if (existingEventsCount >= 1) {
        console.warn("Non-premium user tried to create more than 1 event");
        return res.status(403).json({
          success: false,
          message: "Upgrade to premium to create unlimited events"
        });
      }
    }

    let customizationData = {
      premiumTheme: "Lavender",
    };

    if (hasPremium && invitationCustomization && invitationCustomization.premiumTheme) {
      customizationData.premiumTheme = invitationCustomization.premiumTheme;
    } else {
      console.log("Using default premiumTheme for non-premium or no input:", customizationData.premiumTheme);
    }

    const newEvent = new Event({
      name,
      location,
      description,
      votingTime,
      dates,
      type: "Planned",
      createdBy: userId,
      invitationCustomization: customizationData,  // This is now an object, not an array
    });

    await newEvent.save();

    await checkTopPlannerBadge(userId);

    res.status(201).json({ status: true, message: "Event created successfully", Data: newEvent });

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
      id: event._id, // Add event ID
      name: event.name,
      location: event.location,
      description: event.description,
      votingTime: event.votingTime, // Assuming this is part of the event
      dates: event.dates || '', // Ensure empty array if no dates
      invitationCustomization: event.invitationCustomization || { premiumTheme: "Lavender" }, // Ensure empty object or default
      creatorProfilePicture: event.createdBy?.profilePicture || '',
      voteCount: event.votes.length,
      votersProfilePictures: event.votes.length > 0 ? event.votes.map(vote => vote.user?.profilePicture || '') : '',
      finalizedDate: event.finalizedDate || '',
    }));

    res.status(200).json({ status: true, message: "Events Fetched successfully", Data: modifiedEvents });
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
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (!event.createdBy || event.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied. Only event creator can view this event." });
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
        timeSlot: d.timeSlot || "", // Default empty string if no timeSlot
        voteCount: votesByDateMap[eventDateStr]?.count || 0,
        votersProfilePictures: votesByDateMap[eventDateStr]?.votersProfilePictures || [],
      };
    });

    const invitedUsersProfilePics = event.invitedUsers.map(u => u.profilePicture || null);

    // Fetch invitationCustomization, default to "Lavender" if not present
    const invitationCustomization = event.invitationCustomization || { premiumTheme: "Lavender" };

    const eventDetails = {
      name: event.name || "",
      location: event.location || "",
      description: event.description || "",
      invitationCustomization: invitationCustomization, 
      invitedUsersCount: event.invitedUsers.length || 0,
      invitedUsersProfilePics: invitedUsersProfilePics || [],
      remainingVotingTime: remainingTimeText || "Voting ended",
      dates: datesWithVotes || [], // Default to an empty array if no dates
    };

    res.status(200).json({ status: true, message: 'Event Fetched Successfully', event: eventDetails });
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
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const shareLink = `http://localhost:5000/api/events/invite?eventId=${eventId}`;

    res.status(200).json({ status: true, link: shareLink });
  } catch (error) {
    console.error("Get Share Link Error:", error);  
    res.status(500).json({ status: false, message: "Failed to generate share link" });
  }
};

exports.handleInviteLink = async (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ success: false, message: "Missing event ID" });
  }

  try {
    const event = await Event.findById(eventId)
      .populate('createdBy', 'first_name last_name profilePicture')
      .lean();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login/signup to view the event",
        redirectTo: `/signup?redirect=/invite?eventId=${eventId}`,
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid token", error: err.message });
    }

    const userId = req.user.id;

    if (event.createdBy._id.toString() === userId) {
      return res.status(403).json({ success: false, message: "Event creator cannot access this invite link." });
    }

    if (!event.invitedUsers.some(u => u.toString() === userId)) {
      event.invitedUsers.push(userId);
      await Event.findByIdAndUpdate(eventId, { invitedUsers: event.invitedUsers });
    }

    const responseEvent = {
      name: event.name,
      location: event.location || '',
      description: event.description || '',
      creator: {
        name: `${event.createdBy.first_name} ${event.createdBy.last_name}`,
        profilePicture: event.createdBy.profilePicture || '',
      },
      finalizedDate: event.finalizedDate && event.finalizedDate.date
        ? event.finalizedDate
        : [],
    };

    res.status(200).json({ success: true, event: responseEvent });

  } catch (err) {
    console.error("Invite Link Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getInvitedEventDetailsForVoting = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Fetch the event by its ID and populate the necessary fields
    const event = await Event.findById(eventId)
      .populate({ path: 'createdBy', select: 'first_name profilePicture' })
      .populate({ path: 'invitedUsers', select: 'profilePicture' });

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Check if the user is invited to the event
    if (!event.invitedUsers.some(user => user._id.toString() === userId)) {
      return res.status(403).json({ status: false, message: "User is not invited to this event." });
    }

    // Prevent the event creator from accessing voting details
    if (event.createdBy._id.toString() === userId) {
      return res.status(403).json({ status: false, message: "Event creator cannot access this voting details." });
    }

    // Helper function to format date
    const getFormattedDate = (dateStr) => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dateObj = new Date(dateStr);
      const weekday = days[dateObj.getDay()];

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');

      return `${weekday} ${year}-${month}-${day}`;
    };

    // Format event dates
    const datesWithFormattedDate = event.dates.map(dateObj => ({
      date: getFormattedDate(dateObj.date),
      timeSlot: dateObj.timeSlot,
    }));

    // Collect profile pictures of the invited users
    const invitedUsersProfilePics = event.invitedUsers.map(user => user.profilePicture || null);

    let finalizedDate = "";
    if (event.finalizedDate && event.finalizedDate.date) {
      finalizedDate = getFormattedDate(event.finalizedDate.date);
    }

    // Construct event details response
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
      finalizedDate,  
      timeSlot: event.finalizedDate?.timeSlot || null,
    };

    res.status(200).json({ success: true, event: eventDetails });
  } catch (error) {
    console.error("Get Event Details For Voting Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Validation Done
exports.voteOnEvent = async (req, res) => {
  const { eventId } = req.params;
  const { selectedDate } = req.body;
  const userId = req.user.id;

  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(400).json({
  //     status: false,
  //     message: errors.array()[0].msg,
  //   });
  // }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.createdBy.toString() === userId) {
      return res.status(403).json({ success: false, message: "Event creator cannot vote for their own event." });
    }

    if (!event.invitedUsers.some(user => user.toString() === userId)) {
      return res.status(403).json({ status: false, message: "You are not invited to vote on this event." });
    }

    if (!selectedDate) {
      return res.status(400).json({ success: false, message: "Please select a date to vote." });
    }

    const validDateObj = event.dates.find(d => new Date(d.date).toISOString().split('T')[0] === new Date(selectedDate).toISOString().split('T')[0]);
    if (!validDateObj) {
      return res.status(400).json({ success: false, message: "Selected date is not valid for this event." });
    }

    const alreadyVoted = event.votes.some(vote => vote.user.toString() === userId);
    if (alreadyVoted) {
      return res.status(400).json({ success: false, message: "You already voted" });
    }

    event.votes.push({ user: userId, date: new Date(selectedDate).toISOString().split('T')[0] });
    await event.save();

    let group = await Group.findOne({ eventId });
    if (!group) {
      group = await Group.create({
        eventId,
        members: [userId],
      });
    } else {
      if (!group.members.some(m => m.toString() === userId)) {
        group.members.push(userId);
        await group.save();
      }
    }

    await checkSpeedyVoterBadge(userId);

    res.status(200).json({ success: true, message: "Vote submitted", voteCount: event.votes.length, groupId: group._id });
  } catch (err) {
    console.error("Vote Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getInvitedEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find events where user is invited, but exclude those created by the user
    const events = await Event.find({
      invitedUsers: userId,
      createdBy: { $ne: userId },  // Exclude events created by current user
    }).populate({
      path: "createdBy",
      select: "first_name profilePicture",
    });

    if (events.length === 0) {
      console.log("No invited events found for user.");
      return res.status(404).json({ success: false, message: "No invited events found for the user." });
    }

    const simplifiedEvents = events.map(event => ({
      name: event.name,
      location: event.location,
      plannerName: event.createdBy?.first_name || 'Unknown',
      plannerProfilePicture: event.createdBy?.profilePicture || null,
      finalizedDate: event.finalizedDate,
    }));

    res.status(200).json({ success: true, events: simplifiedEvents });
  } catch (error) {
    console.error("Get Invited Events Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getVotersByDate = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { selectedDate } = req.query;

    if (!selectedDate) {
      return res.status(400).json({ status: false, message: "Please provide selectedDate query parameter." });
    }

    const event = await Event.findById(eventId).populate('votes.user', 'first_name profilePicture');

    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found." });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ status: false, message: "Only event creator can view voters for a date." });
    }

    const selectedDateISO = new Date(selectedDate).toISOString().split('T')[0];

    const votersForDate = event.votes.filter(vote => {
      const voteDateISO = new Date(vote.date).toISOString().split('T')[0];
      return voteDateISO === selectedDateISO;
    }).map(vote => ({
      userId: vote.user._id,
      name: vote.user.first_name,
      profilePicture: vote.user.profilePicture || null
    }));

    res.status(200).json({
      status: true,
      date: selectedDateISO,
      voters: votersForDate,
      totalVoters: votersForDate.length,
    });
  } catch (error) {
    console.error("Get Voters By Date Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// Validation Done 
exports.finalizeEventDate = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { selectedDate } = req.body;

    if (!selectedDate) {
      return res.status(400).json({ status: false, message: "Please provide the selected date to finalize." });
    }

    const event = await Event.findById(eventId).populate('votes.user', '_id first_name');

    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found." });
    }

    if (event.finalizedDate && event.finalizedDate.date) {
      return res.status(400).json({
        status: false,
        message: "Event date has already been finalized and cannot be changed."
      });
    }
    
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ status: false, message: "Access denied. Only event creator can finalize the date." });
    }

    const selectedDateISO = new Date(selectedDate).toISOString().split('T')[0];
    const dateOption = event.dates.find(d => new Date(d.date).toISOString().split('T')[0] === selectedDateISO);

    if (!dateOption) {
      return res.status(400).json({ status: false, message: "Selected date option not found in event." });
    }

    event.finalizedDate = {
      date: new Date(selectedDateISO),
      timeSlot: dateOption.timeSlot,
    };

    await event.save();

    const title = "Event is Confirmed!";
    const message = `The event ${event.name} has been finalized for ${selectedDateISO}. See you there!`;

    const votersForDate = event.votes.filter(vote => {
      const voteDateISO = new Date(vote.date).toISOString().split('T')[0];
      return voteDateISO === selectedDateISO;
    });

    await Promise.all(votersForDate.map(vote =>
      createNotification(vote.user._id, title, message)
    ));

    res.status(200).json({ status: true, message: "Date finalized successfully.", finalizedDate: event.finalizedDate });
  } catch (error) {
    console.error("Finalize Event Date Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

