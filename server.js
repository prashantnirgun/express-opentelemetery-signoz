import "./startup/load_env.js"; // ensures dotenv is loaded first
// ============================================================================
// CRITICAL: Import instrumentation FIRST before any other code
// OpenTelemetry must hook into all modules before they load
// If you import express before instrumentation, OpenTelemetry won't work!
// ============================================================================
import "./instrumentation.js";
import { loggerProvider } from "./instrumentation.js";

import express from "express";
import logger from "./logger.js";

const app = express();
const port = process.env.PORT || 9000;
// ============================================================================
// MIDDLEWARE: Parse incoming JSON requests
// ============================================================================
app.use(express.json());

// ============================================================================
// MIDDLEWARE: Request logging - Log every incoming request
// This automatically creates a span in the distributed trace
// Each request gets logged to SigNoz with method, path, IP, user-agent, etc.
// ============================================================================
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

// ============================================================================
// ROUTES: Define your API endpoints
// Each log is automatically traced and sent to SigNoz
// ============================================================================

// GET / - Root endpoint
app.get("/", (req, res) => {
  logger.info("Root endpoint accessed");
  return res.json({ msg: "Hey There" });
});

// GET /api/health - Health check endpoint
// Shows how to use different log levels (debug < info < warn < error)
app.get("/api/health", (req, res) => {
  logger.debug("Health check endpoint called");
  return res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// GET /error - Route that throws an error (handled by error middleware)
app.get("/error", (req, res, next) => {
  next(new Error("Something went wrong"));
});

// GET /api/error - Error endpoint simulation
// Demonstrates error logging in SigNoz
app.get("/api/error", (req, res) => {
  logger.error("Error endpoint accessed - simulating an error", {
    endpoint: "/api/error",
    errorType: "simulation",
  });
  return res.status(500).json({ error: "Something went wrong!" });
});

// POST /api/data - Receive JSON data
// Shows how to log request bodies and metadata
app.post("/api/data", (req, res) => {
  logger.info("Data received", { body: req.body });
  return res.json({ received: true, data: req.body });
});

// ============================================================================
// ERROR MIDDLEWARE: Centralized error handler
// Catches all errors and logs them to SigNoz with full context
// Unhandled errors are automatically traced and visible in distributed traces
// ============================================================================
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Log the error with full context for debugging
  // Includes stack trace, path, method, message
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Send error response (different messages for dev vs production)
  res.status(status).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error" // Hide details in production for security
        : err.message, // Show error details in development for debugging
  });
});

// ============================================================================
// START SERVER: Listen on port 9000
// All requests will be traced and sent to SigNoz
// ============================================================================
const server = app.listen(port, () => {
  logger.info(`Server is running on local port ${port}`, {
    port,
    environment: process.env.NODE_ENV,
    serviceName: process.env.OTEL_SERVICE_NAME,
    version: process.env.OTEL_SERVICE_VERSION,
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN: Ensure logs are flushed before exit
// This is critical - without this, batched logs won't be sent to SigNoz
// ============================================================================
const gracefulShutdown = async () => {
  logger.info("Server shutting down gracefully...");

  server.close(async () => {
    console.log("Server closed");

    // Give a brief moment for in-flight requests to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Flush all remaining logs to SigNoz
    await loggerProvider.shutdown();
    console.log("All logs flushed to SigNoz");

    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
