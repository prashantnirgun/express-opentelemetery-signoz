import express from "express";
import {
  throwError,
  getErrorEndpoint,
} from "../controllers/errorController.js";

const router = express.Router();

// GET /error - Route that throws an error (handled by error middleware)
router.get("/error", throwError);

// GET /api/error - Error endpoint simulation
router.get("/api/error", getErrorEndpoint);

export default router;
