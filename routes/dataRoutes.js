import express from "express";
import { receiveData } from "../controllers/dataController.js";

const router = express.Router();

// POST /api/data - Receive JSON data
router.get("/api/data", receiveData);

export default router;
