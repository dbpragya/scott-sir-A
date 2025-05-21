const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

router.get('/user-rankings', rankingController.getTopRankings);

module.exports = router;
