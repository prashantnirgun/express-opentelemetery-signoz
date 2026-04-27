import logger from "../logger.js";

// ============================================================================
// ROOT CONTROLLER
// Handles the root "/" endpoint
// ============================================================================

export const getRootEndpoint = (req, res) => {
  logger.info("Root endpoint accessed");
  return res.json({ msg: "Hey There" });
};
