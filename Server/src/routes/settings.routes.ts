import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller";
import { protect, restrictToAdmin } from "../middlewares/auth.middleware";

const router = Router();

// Public: used by client to display branding/contact
router.get("/", getSettings);

// Admin only
router.patch("/", protect, restrictToAdmin, updateSettings);

export default router;

