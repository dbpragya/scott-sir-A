const Event = require("../models/Event");
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { checkTopPlannerBadge } = require('../utils/badgeUtils');
const { checkSpeedyVoterBadge } = require('../utils/badgeUtils');
const Group = require("../models/Group");
const createNotification = require('../utils/createNotification');
const { validationResult } = require("express-validator");

exports.createEvent = async (req, res) => {
  try {
    const { name, location, description, votingTime, dates, invitationCustomization } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !location || !description || !votingTime || !dates) {
      return res.status(400).json({ status: false, message: "All fields are required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found for ID:", userId);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Check subscription status
    const now = new Date();
    const subscription = user.subscription;
    const hasPremium = subscription && 
      subscription.status === 'active' && 
      new Date(subscription.expiryDate) > now;

    // Check if user already has an event if subscription is not active
    if (!hasPremium) {
      const existingEvent = await Event.findOne({ createdBy: userId });
      if (existingEvent) {
        return res.status(400).json({ 
          status: false, 
          message: "You cannot create more than one event. Please upgrade your subscription." 
        });
      }
    }

    // Handle theme selection
    let selectedTheme = "Theme1"; // Default theme
    if (hasPremium && invitationCustomization?.theme) {
      selectedTheme = invitationCustomization.theme;
    }

    // Create event
    const newEvent = new Event({
      name,
      location,
      description,
      votingTime,
      dates,
      type: "Planned",
      createdBy: userId,
      invitationCustomization: { theme: selectedTheme },
    });

    // Save the event to MongoDB
    await newEvent.save();

    // Create a new group (chatroom) for the event using eventId as groupId
    const newGroup = new Group({
      eventId: newEvent._id,  // Use the eventId as the groupId
      members: [{ user: userId, role: "planner" }]  // Add the planner as the first member
    });

    // Save the group to MongoDB
    await newGroup.save();

    // Set the event's groupId to be the same as eventId
    newEvent.groupId = newEvent._id;  // Use eventId as groupId
    await newEvent.save();

    // Optional badge check logic
    await checkTopPlannerBadge(userId);

    // Format response like "planned list"
    const responseData = {
      id: newEvent._id,
      name: newEvent.name,
      location: newEvent.location,
      description: newEvent.description,
      invitationCustomization: newEvent.invitationCustomization,
      type: newEvent.type,
      creatorProfilePicture: {
        name: user.firstName || "Updated Firstname",
        profilePicture: user.profilePicture
          ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, "/")}`
          : "",
      },
      voteCount: newEvent.votes ? newEvent.votes.length : 0,
      votersProfilePictures: [],
      finalizedDate: { date: "", timeSlot: "" },
      groupId: newEvent._id,  // Return the eventId as groupId
    };

    return res.status(200).json({
      status: true,
      message: "Event created successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const events = await Event.find({ type: "Planned", createdBy: userId })
      .sort({ createdAt: -1 })
      .populate({ path: "createdBy", select: "first_name profilePicture" })
      .populate({ path: "votes.user", select: "profilePicture _id voteType" });

    if (events.length === 0) {
      return res.status(404).json({ status: false, message: "No events found" });
    }

    const modifiedEvents = events.map(event => {
      const votesByDateMap = {};

      event.votes.forEach(vote => {
        if (!vote.date || vote.voteType !== "yes") return;

        const voteDateStr = new Date(vote.date).toISOString().split("T")[0];

        if (!votesByDateMap[voteDateStr]) {
          votesByDateMap[voteDateStr] = {
            count: 0,
            votersProfilePictures: new Map() // Use Map to keep unique users
          };
        }

        // Increment only for "yes" votes
        votesByDateMap[voteDateStr].count++;

        if (vote.user && vote.user.profilePicture) {
          votesByDateMap[voteDateStr].votersProfilePictures.set(
            vote.user._id.toString(),
            {
              userId: vote.user._id,
              profilePicture: `${process.env.LIVE_URL}/${vote.user.profilePicture}`
            }
          );
        }
      });

      const datesWithVotes = event.dates.map(d => {
        const eventDateStr = new Date(d.date).toISOString().split("T")[0];

        return {
          date: d.date,
          timeSlot: d.timeSlot || "",
          _id: d._id,
          voteCount: votesByDateMap[eventDateStr]?.count || 0,
          votersProfilePictures: Array.from(
            votesByDateMap[eventDateStr]?.votersProfilePictures?.values() || []
          ) // Convert Map values to array
        };
      });

      const creatorProfilePictureUrl = {
        name: event.createdBy?.first_name || "",
        profilePicture: event.createdBy?.profilePicture
          ? `${process.env.LIVE_URL}/${event.createdBy.profilePicture.replace(/\\/g, "/")}`
          : ""
      };

      const finalizedDate = event.finalizedDate
        ? {
            date: event.finalizedDate.date || "",
            timeSlot: event.finalizedDate.timeSlot || ""
          }
        : { date: "", timeSlot: "" };

      return {
        id: event._id,
        name: event.name || "",
        location: event.location || "",
        description: event.description || "",
        invitationCustomization: event.invitationCustomization || "",
        type: event.type,
        creatorProfilePicture: creatorProfilePictureUrl,
        voteCount: event.votes.filter(vote => vote.voteType === "yes").length,
        votersProfilePictures: Array.from(
          new Map(
            event.votes
              .filter(vote => vote.voteType === "yes" && vote.user?.profilePicture)
              .map(vote => [
                vote.user._id.toString(),
                {
                  userId: vote.user._id,
                  profilePicture: `${process.env.LIVE_URL}/${vote.user.profilePicture}`
                }
              ])
          ).values()
        ), // Unique voters across whole event
        finalizedDate
      };
    });

    res.status(200).json({
      status: true,
      message: "Events Fetched successfully",
      data: modifiedEvents
    });
  } catch (error) {
    console.error("Get Events Error:", error);
    res.status(500).json({ status: false, message: "Failed to fetch events" });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate({ path: 'invitedUsers', select: 'profilePicture _id' })
      .populate({ path: 'votes.user', select: 'profilePicture _id' })
      .populate({ path: 'createdBy', select: 'first_name' });

    if (!event) {
      console.error('Event not found');
      return res.status(404).json({ status: false, message: "Event not found" });
    }

    const group = await Group.findOne({ eventId: req.params.eventId })
      .populate({ path: 'eventId', select: '_id' }) 
      .select('_id');  
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
            remainingTimeText = `${hoursRemaining} h`;
            if (minutesRemaining > 0) {
              remainingTimeText += ` and ${minutesRemaining} min`;
            }
          } else if (minutesRemaining > 0) {
            remainingTimeText = `${minutesRemaining} min`;
          } else {
            remainingTimeText = "Less than a minute remaining";
          }

          remainingTimeText += " remaining";
        }
      }
    }

    if (event.isFinalized) {
      remainingTimeText = "Voting is no longer available — the event is already final.";
    }

    console.log('Remaining Voting Time:', remainingTimeText);

    // Build map: votes per date and time slot, counting only "yes" votes
    const votesByDateAndTimeSlotMap = {};

    event.votes.forEach(vote => {
      console.log(`Processing vote: ${vote.user._id} - ${vote.voteType} on ${vote.date} for ${vote.timeSlot}`);
      if (!vote.date || !vote.timeSlot) return;

      const voteDateStr = new Date(vote.date).toISOString().split('T')[0]; // Format the date to YYYY-MM-DD
      const voteTimeSlot = vote.timeSlot; // Afternoon, Evening, etc.

      const voteKey = `${voteDateStr}-${voteTimeSlot}`; // Create a key based on date and time slot

      if (!votesByDateAndTimeSlotMap[voteKey]) {
        votesByDateAndTimeSlotMap[voteKey] = {
          count: 0,
          votersProfilePictures: [],
          userVoteTypes: {} // Store each user's voteType for the date-time slot combination
        };
      }

      if (vote.voteType === 'yes') {
        votesByDateAndTimeSlotMap[voteKey].count++; // Increment only for "yes" votes
      }

      if (vote.user && vote.voteType === 'yes' && vote.user.profilePicture) {
        votesByDateAndTimeSlotMap[voteKey].votersProfilePictures.push({
          userId: vote.user._id,
          profilePicture: `${process.env.LIVE_URL}/${vote.user.profilePicture}`
        });
      }

      if (vote.user) {
        votesByDateAndTimeSlotMap[voteKey].userVoteTypes[vote.user._id.toString()] = vote.voteType || "";
      }
    });

    console.log('Votes by Date and Time Slot Map:', votesByDateAndTimeSlotMap);

    // Build final dates array with time slots (Morning, Afternoon, Evening)
    const datesWithVotes = event.dates.map(d => {
      const eventDateStr = new Date(d.date).toISOString().split('T')[0];

      // Ensure the time slot passed during event creation is included
      const timeSlots = [d.timeSlot]; // Only the time slot passed during event creation
      const dateVotes = timeSlots.map(timeSlot => {
        const voteKey = `${eventDateStr}-${timeSlot}`;
        const thisDateVotes = votesByDateAndTimeSlotMap[voteKey] || {};

        // Check if the current user has voted, and return their vote type ("yes" or "no")
        const currentUserVoteType = thisDateVotes.userVoteTypes?.[req.user.id] || ""; // Shows the current user's vote

        console.log(`Current user vote for ${timeSlot} on ${eventDateStr}:`, currentUserVoteType);

        return {
          date: formatWeekdayDate(d.date),
          timeSlot: timeSlot,
          voteCount: thisDateVotes.count || 0, // Only count "yes" votes
          voteType: currentUserVoteType, // Show the user's vote type (either "yes" or "no")
          votersProfilePictures: thisDateVotes.votersProfilePictures || [],
        };
      });

      return dateVotes;  // Return the timeSlots for each date
    }).flat(); // Use flat() to merge the time slots array into a single array

    console.log('Final Dates with Votes:', datesWithVotes);

    const invitedUsersProfilePics = event.invitedUsers.map(u => ({
      userId: u._id,
      profilePicture: u.profilePicture ? `${process.env.LIVE_URL}/${u.profilePicture}` : ''
    }));

    const invitationCustomization = event.invitationCustomization || { premiumTheme: "Theme1" };

    const isFinalized = event.isFinalized || false;
    const finalizedData = event.finalizedDate ? {
      date: event.finalizedDate.date || "",
      timeSlot: event.finalizedDate.timeSlot || ""
    } : {
      date: "",
      timeSlot: "",
    };

    const eventType = (event.createdBy._id.toString() === req.user.id)
      ? "Planned"
      : (event.invitedUsers.some(user => user._id.toString() === req.user.id) ? "Invited" : "Not Invited");

    const eventDetails = {
      id: event._id,
      name: event.name || "",
      location: event.location || "",
      description: event.description || "",
      invitationCustomization: invitationCustomization,
      invitedUsersCount: event.invitedUsers.length || 0,
      invitedUsersProfilePics: invitedUsersProfilePics || [],
      remainingVotingTime: remainingTimeText || "Voting ended",
      dates: datesWithVotes || [],
      isFinalized: isFinalized,
      finalizedDate: finalizedData || '',
      type: eventType || '',
      groupId: group?._id || ''
    };

    console.log('Event Details:', eventDetails);

    res.status(200).json({ status: true, message: 'Event Fetched Successfully', data: eventDetails });
  } catch (error) {
    console.error("Get Event Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


const socket = require("socket.io-client");

exports.AcceptInvite = async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;

    console.log(`User ${userId} is attempting to accept invite for event ${eventId}`);

    // Validate eventId
    if (!eventId) {
      console.log("Event ID is missing in the request body");
      return res.status(400).json({ status: false, message: "Event ID is required" });
    }

    // Find event by eventId
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`Event with ID ${eventId} not found`);
      return res.status(404).json({ status: false, message: "Event not found" });
    }

    // Check if the user is already invited
    if (event.invitedUsers.includes(userId)) {
      console.log(`User ${userId} is already invited to event ${eventId}`);
      return res.status(200).json({
        status: true,
        message: "User is already invited to the event",
      });
    }

    // Add user to invitedUsers if not already invited
    event.invitedUsers.push(userId);
    await event.save();
    console.log(`User ${userId} added to invitedUsers for event ${eventId}`);

    // Add user to the group (chatroom) using eventId as groupId
    const group = await Group.findOne({ eventId: eventId });
    if (group) {
      if (!group.members.some((member) => member.user.toString() === userId)) {
        group.members.push({ user: userId, role: "invited" });
        await group.save();
        console.log(`User ${userId} added to the group ${group._id} for event ${eventId}`);
      } else {
        console.log(`User ${userId} is already a member of group ${group._id}`);
      }
    } else {
      console.log(`Group not found for event ${eventId}`);
    }

    // Log the generated invite link for sharing
    const shareLink = `https://your-app-url.com/api/events/invite?eventId=${eventId}`;
    console.log(`Generated share link: ${shareLink}`);

    // Connect to Socket.IO server and join the group chatroom using eventId as groupId
    // You don't need to create a new socket connection here, instead manage it on the client side
    const io = req.app.get("io");

    // Emit the event for the user to join the chatroom
    io.to(eventId).emit("userJoinedGroup", { userId, eventId });
    console.log(`User ${userId} joined group ${eventId}`);

    // Return success response
    return res.status(200).json({
      status: true,
      message: "Invitation Accepted Successfully",
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to process invite",
    });
  }
};







exports.handleInviteLink = async (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ status: false, message: "Missing event ID" });
  }

  try {
    const event = await Event.findById(eventId)
      .populate('createdBy', 'first_name last_name profilePicture')
      .lean();

    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found" });
    }

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Please login/signup to view the event",
        redirectTo: `/signup?redirect=/invite?eventId=${eventId}`,
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({ status: false, message: "Invalid token", error: err.message });
    }

    const userId = req.user.id;

    if (event.createdBy._id.toString() === userId) {
      return res.status(403).json({ status: false, message: "Event creator cannot access this invite link." });
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

    res.status(200).json({ status: true, message: 'Event Joined Successfully', data: responseEvent });

  } catch (err) {
    console.error("Invite Link Error:", err);
    res.status(500).json({ status: false, message: "Server error" });
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
      return res.status(404).json({ status: false, message: "Event not found" });
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
    const invitedUsersProfilePics = event.invitedUsers.map(user => user.profilePicture
      ? `${process.env.LIVE_URL}/${user.profilePicture.replace(/\\/g, '/')}`
      : ''
    );

    let finalizedDate = "";
    if (event.finalizedDate && event.finalizedDate.date) {
      finalizedDate = getFormattedDate(event.finalizedDate.date);
    }

    // Construct event details response
    const eventDetails = {
      eventId: event._id,
      name: event.name,
      location: event.location,
      description: event.description,
      creator: {
        name: event.createdBy?.first_name || '',
        profilePicture: event.createdBy?.profilePicture
          ? `${process.env.LIVE_URL}/${event.createdBy.profilePicture.replace(/\\/g, '/')}`
          : '',
      },
      dates: datesWithFormattedDate,
      invitedUsersCount: event.invitedUsers.length,
      invitedUsersProfilePics,
      finalizedDate,
      timeSlot: event.finalizedDate?.timeSlot || '',
    };

    res.status(200).json({
      status: true,
      message: 'Event Fetched Successfully',
      data: eventDetails
    });
  } catch (error) {
    console.error("Get Event Details For Voting Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// Validation Done
exports.voteOnEvent = async (req, res) => {
  const { eventId } = req.params;
  const { selectedDate, voteType, selectedTimeSlot } = req.body;
  const userId = req.user.id;

  // ✅ Helper to safely extract just YYYY-MM-DD
  const extractDatePart = (dateInput) => {
    if (!dateInput) return null;

    // If the date input is in the format "Monday 2025-06-15", we only care about the date part (2025-06-15)
    if (typeof dateInput === 'string' && dateInput.trim().split(' ').length === 2) {
      const parts = dateInput.trim().split(' ');  // Split the string into [dayOfWeek, date]
      return parts[1]; // Return the date part "2025-06-15"
    }

    // If the date input is already in YYYY-MM-DD format, return it as is
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput; // Already in the correct format
    }

    // Otherwise, handle it like a Date object or string with a time part
    if (typeof dateInput === 'string') {
      const parts = dateInput.trim().split(' ');
      const possibleDate = parts.length > 1 ? parts[1] : parts[0];
      return new Date(possibleDate).toISOString().split('T')[0];
    } else if (dateInput instanceof Date) {
      return dateInput.toISOString().split('T')[0];
    } else {
      throw new Error("Invalid date input type");
    }
  };

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    // Event creator cannot vote for their own event
    if (event.createdBy.toString() === userId) {
      return res.status(403).json({
        status: false,
        message: "Event creator cannot vote for their own event.",
      });
    }

    // Check if the user is invited to vote on this event
    if (!event.invitedUsers.some((user) => user.toString() === userId)) {
      return res.status(403).json({
        status: false,
        message: "You are not invited to vote on this event.",
      });
    }

    // Ensure selected date and timeslot are provided
    if (!selectedDate || !selectedTimeSlot) {
      return res.status(400).json({
        status: false,
        message: "Please select a date and time slot to vote.",
      });
    }

    // Validate vote type
    if (!voteType || !["yes", "no"].includes(voteType.toLowerCase())) {
      return res.status(400).json({
        status: false,
        message: "Invalid vote type. Please use 'yes' or 'no'.",
      });
    }

    // Extract and normalize the date part
    const selectedDatePart = extractDatePart(selectedDate);
    if (!selectedDatePart) {
      return res.status(400).json({
        status: false,
        message: "Invalid selected date.",
      });
    }

    // Find the matching event date
    const validDateObj = event.dates.find((d) => {
      const eventDatePart = extractDatePart(d.date);
      return eventDatePart === selectedDatePart;
    });

    if (!validDateObj) {
      return res.status(400).json({
        status: false,
        message: "Selected date is not valid for this event.",
      });
    }

    // ✅ Check if the user has already voted for the same date and time slot (ignoring time part of the date)
    const alreadyVoted = event.votes.some(
      (vote) =>
        vote.user.toString() === userId &&
        extractDatePart(vote.date) === selectedDatePart &&  // Compare only the date part
        vote.timeSlot === selectedTimeSlot
    );

    if (alreadyVoted) {
      console.log("User has already voted for the same date and time slot.");
      return res.status(400).json({
        status: false,
        message: "You have already voted for this time slot on the selected date.",
      });
    }

    // ✅ Store the vote with the date and timeslot if no duplicate vote found
    event.votes.push({
      user: userId,
      date: selectedDatePart,
      voteType: voteType.toLowerCase(),
      timeSlot: selectedTimeSlot,
    });

    // Save the event after updating the votes array
    await event.save();

    console.log("Updated votes:", event.votes);

    // ✅ Add user to the group if not already added
    let group = await Group.findOne({ eventId });
    if (!group) {
      group = await Group.create({
        eventId,
        members: [userId],
      });
    } else {
      if (!group.members.some((m) => m.toString() === userId)) {
        group.members.push(userId);
        await group.save();
      }
    }

    await checkSpeedyVoterBadge(userId);

    res.status(200).json({
      status: true,
      message: "Vote submitted",
    });
  } catch (err) {
    console.error("Vote Error:", err);
    res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
}


exports.getInvitedEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const events = await Event.find({
      invitedUsers: userId,
      createdBy: { $ne: userId },
    })
      .populate({
        path: "createdBy",
        select: "first_name profilePicture",
      })
      .populate({
        path: "votes.user",
        select: "profilePicture _id",
      });

    if (events.length === 0) {
      console.log("No invited events found for user.");
      return res.status(404).json({
        status: false,
        message: "No invited events found for the user.",
      });
    }

    const simplifiedEvents = events.map(event => {
      const votesByDateMap = {};
      event.votes.forEach(vote => {
        if (!vote.date) {
          return;
        }

        if (vote.voteType !== "yes") {
          return;
        }

        const voteDateStr = new Date(vote.date).toISOString().split('T')[0];
        if (!votesByDateMap[voteDateStr]) {
          votesByDateMap[voteDateStr] = {
            count: 0,
            votersProfilePictures: new Map() // ✅ use Map for uniqueness
          };
        }
        votesByDateMap[voteDateStr].count++;
        if (vote.user && vote.user.profilePicture) {
          votesByDateMap[voteDateStr].votersProfilePictures.set(
            vote.user._id.toString(),
            {
              userId: vote.user._id,
              profilePicture: `${process.env.LIVE_URL}/${vote.user.profilePicture.replace(/\\/g, "/")}`
            }
          );
        }
      });

      const datesWithVotes = event.dates.map(d => {
        const eventDateStr = new Date(d.date).toISOString().split('T')[0];
        return {
          date: d.date,
          timeSlot: d.timeSlot || "",
          _id: d._id,
          voteCount: votesByDateMap[eventDateStr]?.count || 0,
          votersProfilePictures: Array.from(
            votesByDateMap[eventDateStr]?.votersProfilePictures?.values() || []
          ), // ✅ unique profiles only
        };
      });

      const creator = {
        name: event.createdBy?.first_name || "",
        profilePicture: event.createdBy?.profilePicture
          ? event.createdBy.profilePicture.replace(/\\/g, "/")
          : ""
      };

      const creatorProfilePictureUrl = creator.profilePicture
        ? `${process.env.LIVE_URL}/${creator.profilePicture}`
        : "";

      const finalizedDate = event.finalizedDate
        ? {
            date: event.finalizedDate.date || "",
            timeSlot: event.finalizedDate.timeSlot || ""
          }
        : {
            date: "",
            timeSlot: ""
          };

      const yesVotes = event.votes.filter(vote => vote.voteType === "yes");

      // ✅ make event-level voters unique
      const uniqueVotersMap = new Map();
      yesVotes.forEach(vote => {
        if (vote.user && vote.user.profilePicture) {
          uniqueVotersMap.set(vote.user._id.toString(), {
            userId: vote.user._id,
            profilePicture: `${process.env.LIVE_URL}/${vote.user.profilePicture.replace(/\\/g, "/")}`
          });
        }
      });

      return {
        id: event._id,
        name: event.name || "",
        location: event.location || "",
        description: event.description || "",
        invitationCustomization: event.invitationCustomization || '',
        type: "Invited",
        creatorProfilePicture: {
          name: creator.name,
          profilePicture: creatorProfilePictureUrl
        },
        voteCount: yesVotes.length,
        votersProfilePictures: Array.from(uniqueVotersMap.values()), // ✅ unique profiles only
        finalizedDate
      };
    });

    res.status(200).json({
      status: true,
      message: "Event Fetched Successfully",
      data: simplifiedEvents
    });

  } catch (error) {
    console.error("Get Invited Events Error:", error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};





exports.getVotersByDate = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { selectedDate, timeSlot } = req.query;

    if (!selectedDate || !timeSlot) {
      return res.status(400).json({
        status: false,
        message: "Please provide both selectedDate and timeSlot query parameters."
      });
    }

    const event = await Event.findById(eventId).populate('votes.user', 'first_name profilePicture voteType');
    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found."
      });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: false,
        message: "Only event creator can view voters for a date."
      });
    }

    const selectedDateISO = new Date(selectedDate).toISOString().split('T')[0];
    const normalizedQueryTimeSlot = timeSlot.trim().toLowerCase();

    console.log(`🔍 Requested Date: ${selectedDateISO}, TimeSlot: ${normalizedQueryTimeSlot}`);
    console.log(`📦 Total Votes Found: ${event.votes.length}`);

    // Log all vote details
    event.votes.forEach((vote, index) => {
      console.log(`🔸 Vote #${index + 1}`);
      console.log(`  └ date: ${new Date(vote.date).toISOString()}`);
      console.log(`  └ voteDateISO: ${new Date(vote.date).toISOString().split('T')[0]}`);
      console.log(`  └ voteType: ${vote.voteType}`);
      console.log(`  └ timeSlot: ${vote.timeSlot}`);
      console.log(`  └ timeSlot(normalized): ${vote.timeSlot?.trim().toLowerCase()}`);
    });

    const votersForDate = event.votes.filter(vote => {
      const voteDateISO = new Date(vote.date).toISOString().split('T')[0];
      const normalizedVoteTimeSlot = vote.timeSlot?.trim().toLowerCase();

      const match =
        voteDateISO === selectedDateISO &&
        normalizedVoteTimeSlot === normalizedQueryTimeSlot &&
        vote.voteType === 'yes';

      if (match) {
        console.log(`✅ Matched vote: user ${vote.user?.first_name || 'Unknown'}`);
      }

      return match;
    }).map(vote => ({
      userId: vote.user._id,
      name: vote.user.first_name,
      profilePicture: vote.user.profilePicture
        ? `${process.env.LIVE_URL}/${vote.user.profilePicture.replace(/\\/g, '/')}`
        : ""
    }));

    console.log(`✅ Total Voters Matched: ${votersForDate.length}`);

    res.status(200).json({
      status: true,
      message: "Voters for the selected date and timeslot retrieved successfully.",
      data: {
        eventId,
        description: event.description,
        date: selectedDateISO,
        timeSlot,
        voters: votersForDate,
        totalVoters: votersForDate.length
      }
    });

  } catch (error) {
    console.error("❌ Get Voters By Date Error:", error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};


// Validation Done 
exports.finalizeEventDate = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { selectedDate, selectedTimeSlot } = req.body; // Get both selectedDate and selectedTimeSlot


    if (!selectedDate || !selectedTimeSlot) {
      console.log("No selected date or time slot provided.");
      return res.status(400).json({
        status: false,
        message: "Please provide both selected date and time slot to finalize."
      });
    }

    // Check if selectedDate is in valid date format (ISO 8601)
    // const dateRegex = /^\w+\s\d{4}-\d{2}-\d{2}$/;  // Match the format "Monday 2025-06-15"
    // if (!dateRegex.test(selectedDate)) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Selected date must be a valid ISO 8601 date."
    //   });
    // }

    // Convert the selectedDate to ISO format
    const selectedDateISO = new Date(selectedDate.split(' ')[1]).toISOString().split('T')[0];

    const event = await Event.findById(eventId).populate('votes.user', '_id first_name');

    if (!event) {
      console.log("Event not found.");
      return res.status(404).json({ status: false, message: "Event not found." });
    }

    if (event.finalizedDate && event.finalizedDate.date) {
      console.log("Event has already been finalized. Cannot change the date.");
      return res.status(400).json({
        status: false,
        message: "Event date has already been finalized and cannot be changed."
      });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ status: false, message: "Access denied. Only event creator can finalize the date." });
    }

    const dateOption = event.dates.find(d => new Date(d.date).toISOString().split('T')[0] === selectedDateISO && d.timeSlot === selectedTimeSlot);

    if (!dateOption) {
      console.log("Selected date and time slot option not found in event dates.");
      return res.status(400).json({
        status: false,
        message: "Selected date and time slot option not found in event."
      });
    }

    // Finalizing the event date and time slot
    event.finalizedDate = {
      date: new Date(selectedDateISO),
      timeSlot: selectedTimeSlot, // Store the selected time slot
    };

    // Set the event as finalized
    event.isFinalized = true;  // Set isFinalized to true after finalizing the date

    await event.save();
    console.log("Event saved successfully with finalized status.");

    const title = "Event is Confirmed!";
    const message = `The event ${event.name} has been finalized for ${selectedDateISO} at ${selectedTimeSlot}. See you there!`;

    // Notify voters
    const votersForDate = event.votes.filter(vote => {
      const voteDateISO = new Date(vote.date).toISOString().split('T')[0];
      return voteDateISO === selectedDateISO;
    });

    await Promise.all(votersForDate.map(vote =>
      createNotification(vote.user._id, title, message)
    ));

    res.status(200).json({
      status: true,
      message: "Date and time slot finalized successfully.",
      data: event.finalizedDate
    });
  } catch (error) {
    console.error("Finalize Event Date Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

