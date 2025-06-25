const express = require('express');
const dotenv = require('dotenv');
const path = require("node:path");
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

dotenv.config();

connectDB();

const app = express();
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); 

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes')); 
app.use('/api/userprofile', require('./routes/profileRoutes')); 
app.use('/api/notifications', require('./routes/notificationRoutes')); 
app.use("/api/message", require("./routes/messageRoutes"));
app.use("/api", require("./routes/userandgroupRoutes"));
app.use("/api/ranking", require("./routes/rankingRoutes"));
app.use("/.well-known/assetlinks.json", require("./routes/deeplinkRoutes"));
app.use(errorHandler);

module.exports = app;   