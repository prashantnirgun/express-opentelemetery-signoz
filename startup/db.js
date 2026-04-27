import mongoose from "mongoose";
import logger from "../logger.js";

// ============================================================================
// DATABASE CONNECTION
// Connects to MongoDB using Mongoose with OpenTelemetry logging
// ============================================================================

export const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is not defined in environment variables. Please set it in your .env file.",
      );
    }

    // Configure mongoose connection options
    const mongooseOptions = {
      // Connection timeout (30 seconds)
      serverSelectionTimeoutMS: 30000,
      // Socket timeout (45 seconds)
      socketTimeoutMS: 45000,
      // Automatically retry failed operations
      retryWrites: true,
    };

    // Connect to MongoDB
    await mongoose.connect(mongoUri, mongooseOptions);

    // Log successful connection
    logger.info("MongoDB connected successfully", {
      mongodbUri: mongoUri.replace(/\/\/.*:.*@/, "//***:***@"), // Mask credentials in logs
      environment: process.env.NODE_ENV,
    });

    // Listen for connection events
    mongoose.connection.on("connected", () => {
      logger.info("Mongoose connected to MongoDB");
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("Mongoose disconnected from MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", {
        error: err.message,
        code: err.code,
      });
    });

    return mongoose.connection;
  } catch (error) {
    logger.error("Failed to connect to MongoDB", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1); // Exit if database connection fails
  }
};

// ============================================================================
// DATABASE DISCONNECT
// Gracefully closes the MongoDB connection
// ============================================================================

export const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      logger.info("MongoDB disconnected successfully");
    }
  } catch (error) {
    logger.error("Error disconnecting from MongoDB", {
      error: error.message,
    });
  }
};
