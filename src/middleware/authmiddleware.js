const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Extract token from header

  if (!token) {
    return res.status(401).json({ status: false, message: "No token, access denied" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined!");
    return res.status(500).json({ status: false, message: "Server configuration error" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded; // Attach user data to request
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ status: false, message: "Token is not valid" });
  }
};
