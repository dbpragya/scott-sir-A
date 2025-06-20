const mongoose = require("mongoose");
const { ValidationError } = mongoose;
// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  try {
    console.error(err);
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.response.data.message || "Something went wrong!",
      });
    }

    // If the error has a custom statusCode and message, use those
    if (err.statusCode && err.message) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    // Mongoose ValidationError
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${message}`,
      });
    }

    // Mongoose CastError (for invalid ObjectId or data types)
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid ${err.path}: ${err.value}`,
      });
    }

    // MongoDB duplicate key error (e.g., duplicate field value)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate field value entered.",
      });
    }

    // General error fallback
    return res.status(500).json({
      success: false,
      message: err.message || "Something went wrong.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: err.message || "Something went wrong.",
    });
  }
};

module.exports = errorHandler;
