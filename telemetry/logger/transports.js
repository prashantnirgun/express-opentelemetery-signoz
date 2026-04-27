// ============================================================================
// Logger Transports Configuration
// Defines where and how logs are sent
// ============================================================================

import winston from "winston";
import { OTLPTransport } from "./otlp-transport.js";
import { getConsoleFormat } from "./formatters.js";

/**
 * Get all configured transports for the logger
 * Includes OTLP (for SigNoz) and Console (for development/debugging)
 */
export const getTransports = () => {
  const transports = [
    // OTLP Transport: Send logs to SigNoz
    // This is the main transport for observability
    new OTLPTransport(),

    // Console Transport: Also print logs to terminal
    // Useful for local development and debugging
    new winston.transports.Console({
      format: getConsoleFormat(),
    }),
  ];

  return transports;
};
