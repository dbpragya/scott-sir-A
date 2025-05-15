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
  theme: {
    type: String,
    enum: ["Lavender", "Make blue", "Sky blue", "Spicy red", "Summer", "Night light"],
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
  }
],
  invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  type: {
    type: String,
    enum: ["Planned", "Invited"],
    default: "Planned",
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