import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { protect, restrictToAdmin } from "../middlewares/auth.middleware";

const router = Router();

// Phải đăng nhập và là Admin mới gọi được các API dưới đây
router.use(protect);
router.use(restrictToAdmin);

router.get("/", userController.getAllUsers);
router.patch("/:id/role", userController.updateRole);
router.patch("/:id/status", userController.toggleStatus);
router.delete("/:id", userController.deleteUser);

export default router;