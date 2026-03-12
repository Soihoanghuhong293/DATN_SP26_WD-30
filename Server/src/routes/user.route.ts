import { Router } from "express";
import * as userController from "../controllers/user.controller"; // Thêm .js nếu file app.ts của bạn dùng chuẩn import module
import { protect, restrictToAdmin } from "../middlewares/auth.middleware";

const router = Router();

// BẮT BUỘC: Phải đăng nhập và là Admin mới được xài các API này
router.use(protect);
router.use(restrictToAdmin);

router.get("/", userController.getAllUsers);
router.patch("/:id/role", userController.updateRole);
router.patch("/:id/status", userController.toggleStatus);
router.delete("/:id", userController.deleteUser);

export default router;