import logger from "../logger.js";

// ============================================================================
// HEALTH CONTROLLER
// Handles health check endpoints
// Shows how to use different log levels (debug < info < warn < error)
// ============================================================================

export const getHealthStatus = (req, res) => {
  logger.debug("Health check endpoint called");
  return res.json({ status: "healthy", timestamp: new Date().toISOString() });
};
