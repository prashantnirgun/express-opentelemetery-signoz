import winston from "winston";
import { context, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { SeverityNumber } from "@opentelemetry/api-logs";

// ============================================================================
// TRACE CONTEXT ENRICHMENT
// Automatically adds trace_id and span_id to every log
// This correlates logs with distributed traces for better debugging
// ============================================================================

const addTraceContext = winston.format((info) => {
  // Get the current active span from the distributed trace context
  const span = trace.getSpan(context.active());

  if (span) {
    // Extract trace IDs from the span
    const spanContext = span.spanContext();
    // Add trace IDs to the log record
    // These IDs link the log back to the distributed trace in SigNoz
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
  }
  return info;
});

// ============================================================================
// CUSTOM OTLP TRANSPORT
// Sends logs to SigNoz via OpenTelemetry Protocol (OTLP)
// ============================================================================

class OTLPTransport extends winston.Transport {
  log(info, callback) {
    // Use setImmediate to avoid blocking the main thread
    setImmediate(() => {
      // Get the global logger that was registered in instrumentation.js
      const logger = logs.getLogger("winston-logger");

      // Map Winston log levels to OpenTelemetry severity levels
      // This ensures logs display correctly in SigNoz
      const severityMap = {
        error: SeverityNumber.ERROR,
        warn: SeverityNumber.WARN,
        info: SeverityNumber.INFO,
        debug: SeverityNumber.DEBUG,
      };

      // Extract fields that should not be in attributes
      const { level, message, timestamp, service, ...customAttributes } = info;

      // Build the message body: include message + metadata if present
      let body = message;
      if (Object.keys(customAttributes).length > 0) {
        body += ` ${JSON.stringify(customAttributes)}`;
      }

      // Emit the log to SigNoz
      logger.emit({
        body: body, // Message + JSON metadata visible in SigNoz
        severityNumber: severityMap[level] || SeverityNumber.INFO, // Log level as number
        severityText: (level || "info").toUpperCase(), // Log level as text
        attributes: {
          // Send all metadata as attributes for filtering in SigNoz
          service: service || "unknown",
          timestamp: timestamp,
          ...customAttributes, // All custom fields (port, environment, etc.)
          ...(info.trace_id && { trace_id: info.trace_id }),
          ...(info.span_id && { span_id: info.span_id }),
        },
      });

      if (callback) {
        callback();
      }
    });
  }
}

// Check if running in production
const isProd = process.env.NODE_ENV === "production";

// ============================================================================
// WINSTON LOGGER CREATION
// Combined with OpenTelemetry for full observability
// ============================================================================

const logger = winston.createLogger({
  // Log level: only logs at this level and above are shown
  // (error > warn > info > debug)
  level: process.env.LOG_LEVEL,

  // Format: Combine multiple formatters to enrich logs
  format: winston.format.combine(
    addTraceContext(), // Add trace_id and span_id to correlate with traces
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss", // Human-readable timestamp
    }),
    winston.format.errors({ stack: true }), // Capture stack traces for errors
    winston.format.splat(), // Support string interpolation
    winston.format.json(), // Output as JSON for structured logging
  ),

  // Default metadata attached to all logs
  defaultMeta: {
    service: process.env.OTEL_SERVICE_NAME || "my-app-local",
  },

  // Transports: Where logs are sent
  transports: [
    // OTLP Transport: Send logs to SigNoz
    // This is the main transport for observability
    new OTLPTransport(),

    // Console Transport: Also print logs to terminal
    // Useful for local development and debugging
    new winston.transports.Console({
      format: isProd
        ? winston.format.json() // Production: JSON format for log aggregation
        : winston.format.combine(
            winston.format.colorize(), // Colorized output for readability
            winston.format.printf(
              ({ level, message, timestamp, ...metadata }) => {
                // Development: Pretty-print logs with colors
                let msg = `${timestamp} [${level}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                  msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
              },
            ),
          ),
    }),
  ],
});

// Helper stream for HTTP request logging (used by Morgan if needed)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;
