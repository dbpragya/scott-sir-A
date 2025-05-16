// FOR PERSONAL USE ONLY

const express = require("express");
const router = express.Router();
const User = require("../models/User"); 
const Group = require("../models/Group"); 

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ isVerify: true }).select("_id first_name email");
    const responseUsers = users.map(user => ({
      userId: user._id.toString(),
      firstName: user.first_name,
      email: user.email,
    }));
    res.json({ users: responseUsers });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

router.get("/users/:userId/groups", async (req, res) => {
  const { userId } = req.params;
  try {
    const groups = await Group.find({ members: userId }).select("_id");
    const groupIds = groups.map(g => g._id.toString());
    res.json({ groups: groupIds });
  } catch (err) {
    console.error("Error fetching groups for user:", err);
    res.status(500).json({ message: "Server error fetching groups" });
  }
});


module.exports = router;
