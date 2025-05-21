const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes')); 
app.use('/api/userprofile', require('./routes/profileRoutes')); 
app.use('/api/notifications', require('./routes/notificationRoutes')); 
app.use("/api/message", require("./routes/messageRoutes"));
app.use("/api", require("./routes/userandgroupRoutes"));
app.use("/api/ranking", require("./routes/rankingRoutes"));

module.exports = app;   