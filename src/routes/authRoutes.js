const express = require('express');
const { Login } = require('../controllers/authController');

const router = express.Router();

router.get("/test", (req, res) => {
    res.send("Auth route working!");
  });
  
module.exports = router;