import rootRoutes from "./rootRoutes.js";
import healthRoutes from "./healthRoutes.js";
import errorRoutes from "./errorRoutes.js";
import dataRoutes from "./dataRoutes.js";
import jobRoutes from "../modules/jobs/job.routes.js";

export const registerRoutes = (app) => {
  // Root routes
  app.use("/", rootRoutes);

  // API routes
  app.use("/api", healthRoutes);
  app.use("/api", jobRoutes);
  app.use("/", errorRoutes);
  app.use("/", dataRoutes);
};
