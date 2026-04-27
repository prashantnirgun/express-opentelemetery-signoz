import logger from "../logger.js";

// ============================================================================
// ERROR CONTROLLER
// Handles error-related endpoints
// Demonstrates error logging in SigNoz
// ============================================================================

export const throwError = (req, res, next) => {
  next(new Error("Something went wrong"));
};

export const getErrorEndpoint = (req, res) => {
  logger.error("Error endpoint accessed - simulating an error", {
    endpoint: "/api/error",
    errorType: "simulation",
  });
  return res.status(500).json({ error: "Something went wrong!" });
};
