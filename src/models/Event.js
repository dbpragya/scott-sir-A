const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: String,
  description: String,
  votingTime: {
    type: String,
    enum: ["24hrs", "48hrs"],
    required: true,
  },
  dates: [
    {
      date: { type: Date, required: true },
      timeSlot: {
        type: String,
        enum: ["Morning", "Afternoon", "Evening"],
        required: true,
      },
    }
  ],
  votes: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      date: { type: Date, required: true },
          voteType: { type: String, enum: ["yes", "no"] } 
    }
  ],
  invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  finalizedDate: {
    date: Date,
    timeSlot: String
  },
   isFinalized: {
    type: Boolean,
    default: false, 
  },
  type: {
    type: String,
    enum: ["Planned", "Invited"],
    default: "Planned",
  },
invitationCustomization: {
  theme: {
    type: String,
    enum: ["Theme1", "Theme2", "Theme3", "Theme4", "Theme5", "Theme6"],
    default: "Theme1"
  }
},
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
});

module.exports = mongoose.model("Event", eventSchema);