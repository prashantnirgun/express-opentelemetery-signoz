// ============================================================================
// OTLP Transport
// Sends logs to SigNoz via OpenTelemetry Protocol (OTLP)
// ============================================================================

import winston from "winston";
import { logs } from "@opentelemetry/api-logs";
import { SeverityNumber } from "@opentelemetry/api-logs";

export class OTLPTransport extends winston.Transport {
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
