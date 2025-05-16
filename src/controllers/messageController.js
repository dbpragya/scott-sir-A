const Message = require("../models/Message");
const Group = require("../models/Group");

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, message: "Group not found" });
    }
    if (!group.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ status: false, message: "Access denied" });
    }
    const messages = await Message.find({ groupId })
      .sort({ sentAt: 1 })
      .populate("sender", "name avatar");

    res.json({ status: true, messages });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};