import { Router } from "express";
import { protect, restrictToAdmin, restrictToGuide } from "../middlewares/auth.middleware";
import {
  approveGuideLeaveRequest,
  countGuideLeaveRequestsAdmin,
  createGuideLeaveRequest,
  getMyLeaveRequestForTrip,
  listGuideLeaveRequestsAdmin,
  rejectGuideLeaveRequest,
} from "../controllers/guideLeaveRequest.controller";

const router = Router();

router.get("/me/for-trip", protect, restrictToGuide, getMyLeaveRequestForTrip);
router.post("/", protect, restrictToGuide, createGuideLeaveRequest);

router.get("/count", protect, restrictToAdmin, countGuideLeaveRequestsAdmin);
router.get("/", protect, restrictToAdmin, listGuideLeaveRequestsAdmin);
router.patch("/:id/approve", protect, restrictToAdmin, approveGuideLeaveRequest);
router.patch("/:id/reject", protect, restrictToAdmin, rejectGuideLeaveRequest);

export default router;
