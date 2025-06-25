const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, getTotalEvents, changePassword, logout, updateAllNotifications, updateChatNotifications, getPlan, purchasePlan } = require("../controllers/profileController");
const { updateProfileValidationRules, changePasswordValidationRules, updateAllNotificationsValidationRules, updateChatNotificationsValidationRules } = require("../validators/validation");
const authenticateUser = require("../middleware/authmiddleware")

router.get("/profile", authenticateUser, getProfile);
router.put('/update-profile', updateProfileValidationRules, authenticateUser,  updateProfile);
router.get('/total-events', authenticateUser, getTotalEvents);
router.put('/change-password', changePasswordValidationRules, authenticateUser, changePassword);
router.post('/logout', authenticateUser, logout);
router.put('/all-notifications', updateAllNotificationsValidationRules, authenticateUser, updateAllNotifications);
router.put('/chat-notifications', updateChatNotificationsValidationRules, authenticateUser, updateChatNotifications);

router.get('/premium-plan', authenticateUser, getPlan);
router.post('/purchase', authenticateUser, purchasePlan);

module.exports = router;
