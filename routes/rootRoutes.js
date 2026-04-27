import express from "express";
import { getRootEndpoint } from "../controllers/rootController.js";

const router = express.Router();

// GET / - Root endpoint
router.get("/", getRootEndpoint);

export default router;
