import winston from "winston";
import { getCombinedFormat } from "./formatters.js";
import { getTransports } from "./transports.js";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  format: getCombinedFormat(),
  defaultMeta: { service: process.env.OTEL_SERVICE_NAME || "my-app-local" },
  transports: getTransports(),
});

logger.stream = { write: (message) => logger.info(message.trim()) };

export default logger;
