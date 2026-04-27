import express from "express";
import { getHealthStatus } from "../controllers/healthController.js";

const router = express.Router();

// GET /api/health - Health check endpoint
router.get("/health", getHealthStatus);

export default router;
