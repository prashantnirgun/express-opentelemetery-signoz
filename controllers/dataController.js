import logger from "../logger.js";

// ============================================================================
// DATA CONTROLLER
// Handles data-related endpoints
// Shows how to log request bodies and metadata
// ============================================================================

export const receiveData = (req, res) => {
  const data = {
    name: "Prashant",
    company: "The Software Source",
  };
  logger.info("Data received", data);
  return res.json({ received: true, data });
};
