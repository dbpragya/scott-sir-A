const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();
const path = require("path");
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); 

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes')); 
app.use('/api/userprofile', require('./routes/profileRoutes')); 
app.use('/api/notifications', require('./routes/notificationRoutes')); 
app.use("/api/message", require("./routes/messageRoutes"));
app.use("/api", require("./routes/userandgroupRoutes"));
app.use("/api/ranking", require("./routes/rankingRoutes"));
app.use("/.well-known/assetlinks.json", require("./routes/deeplinkRoutes"))

module.exports = app;   