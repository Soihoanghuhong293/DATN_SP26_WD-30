import { Router } from "express";
import { register, login, me, updateMe, changePassword } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, me);
router.patch("/me", protect, updateMe);
router.patch("/change-password", protect, changePassword);

export default router;