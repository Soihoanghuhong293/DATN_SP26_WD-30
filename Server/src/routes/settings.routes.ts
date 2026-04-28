import { Router } from "express";
import { getSettings, resetSettings, updateSettings } from "../controllers/settings.controller";
import { protect, restrictToAdmin } from "../middlewares/auth.middleware";

const router = Router();

// Public: used by client to display branding/contact
router.get("/", getSettings);

// Admin only
router.patch("/", protect, restrictToAdmin, updateSettings);
router.post("/reset", protect, restrictToAdmin, resetSettings);

export default router;

