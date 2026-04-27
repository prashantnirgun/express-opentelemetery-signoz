// ============================================================================
// Logger Formatters
// Configures how logs are formatted for different transports
// ============================================================================

import winston from "winston";
import { addTraceContext } from "./trace-context.js";

const isProd = process.env.NODE_ENV === "production";

/**
 * Console Format Configuration
 * Different formatting for production vs development
 */
export const getConsoleFormat = () => {
  return isProd
    ? winston.format.json() // Production: JSON format for log aggregation
    : winston.format.combine(
        winston.format.colorize(), // Colorized output for readability
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          // Development: Pretty-print logs with colors
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        }),
      );
};

/**
 * Combined Format for Logger
 * Applied to all log entries regardless of transport
 */
export const getCombinedFormat = () => {
  return winston.format.combine(
    addTraceContext(), // Add trace_id and span_id to correlate with traces
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss", // Human-readable timestamp
    }),
    winston.format.errors({ stack: true }), // Capture stack traces for errors
    winston.format.splat(), // Support string interpolation
    winston.format.json(), // Output as JSON for structured logging
  );
};
