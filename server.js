import "./startup/load_env.js"; // ensures dotenv is loaded first
// ============================================================================
// CRITICAL: Import instrumentation FIRST before any other code
// OpenTelemetry must hook into all modules before they load
// If you import express before instrumentation, OpenTelemetry won't work!
// ============================================================================
import "./telemetry/instrumentation.js";
import { loggerProvider } from "./telemetry/instrumentation.js";

import express from "express";
import logger from "./telemetry/logger.js";
import { registerRoutes } from "./routes/index.js";
import { connectDatabase, disconnectDatabase } from "./startup/db.js";

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
// ROUTES: Register all application routes
// Routes are organized in controllers/routes folders for better maintainability
// ============================================================================
registerRoutes(app);

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
const startServer = async () => {
  try {
    // Connect to MongoDB before starting the server
    await connectDatabase();

    const server = app.listen(port, () => {
      logger.info(`Server is running on local port ${port}`, {
        port,
        environment: process.env.NODE_ENV,
        serviceName: process.env.OTEL_SERVICE_NAME,
        version: process.env.OTEL_SERVICE_VERSION,
      });
    });

    // ============================================================================
    // GRACEFUL SHUTDOWN: Ensure logs are flushed and database disconnected
    // This is critical - without this, batched logs won't be sent to SigNoz
    // ============================================================================
    const gracefulShutdown = async () => {
      logger.info("Server shutting down gracefully...");

      server.close(async () => {
        console.log("Server closed");

        // Give a brief moment for in-flight requests to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Disconnect from MongoDB
        await disconnectDatabase();

        // Flush all remaining logs to SigNoz
        await loggerProvider.shutdown();
        console.log("All logs flushed to SigNoz");

        process.exit(0);
      });
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Start the server
startServer();
