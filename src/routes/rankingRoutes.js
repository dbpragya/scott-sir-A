const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
const authenticateUser = require("../middleware/authmiddleware");

router.get('/user-rankings', authenticateUser, rankingController.getTopRankings);

module.exports = router;
