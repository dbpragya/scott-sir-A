const express = require('express');
const router = express.Router();
const { getUserNotifications } = require('../controllers/notificationController');
const authenticateUser = require('../middleware/authmiddleware');

router.get('/user-notifications', authenticateUser, getUserNotifications);

module.exports = router;
    