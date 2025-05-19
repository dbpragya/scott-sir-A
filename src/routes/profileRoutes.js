const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, getTotalEvents, changePassword, logout, updateAllNotifications, updateChatNotifications, getPlan, purchasePlan } = require("../controllers/profileController");
const authenticateUser = require("../middleware/authmiddleware")

router.get("/profile", authenticateUser, getProfile);
router.put('/update-profile', authenticateUser, updateProfile);
router.get('/total-events', authenticateUser, getTotalEvents);
router.put('/change-password', authenticateUser, changePassword);
router.post('/logout', authenticateUser, logout);
router.put('/all-notifications', authenticateUser, updateAllNotifications);
router.put('/chat-notifications', authenticateUser, updateChatNotifications);

// for premium plan
router.get('/premium-plan', authenticateUser, getPlan);
router.post('/purchase', authenticateUser, purchasePlan);


module.exports = router;
