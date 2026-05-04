import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js"; 
import Guide from "../models/Guide.js"; // 👈 THÊM IMPORT NÀY
import type { AuthRequest } from "../middlewares/auth.middleware";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hash = await bcrypt.hash(password, 10);

    const validRoles = ["user", "admin", "guide", "hdv"];
    const assignedRole = validRoles.includes(role) ? role : "user";

    // 1. TẠO TÀI KHOẢN ĐĂNG NHẬP
    const user = await User.create({
      name,
      email,
      password: hash,
      role: assignedRole,
    });

    // 2. NẾU LÀ HDV -> TỰ ĐỘNG TẠO HỒ SƠ GUIDE (Auto-Sync)
    if (assignedRole === "guide") {
      await Guide.create({
        user_id: user._id, // Khóa ngoại 1-1
        name: user.name,   // Đẩy tên qua luôn
        email: user.email, // Đẩy email qua
        // Tránh lỗi unique index phone_1 với giá trị null (DB cũ có thể không-sparse)
        phone: `AUTO-${String(user._id)}`,
        languages: ["Vietnamese"],
        experience: { years: 0 },
        group_type: "domestic",
        health_status: "healthy",
        history: [],
        rating: { average: 0, totalReviews: 0, reviews: [] },
      });
    }

    res.json({
      message: "Đăng ký thành công",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
    });
  } catch (error) {
    console.error(error); // Nên log ra để dễ debug nếu có lỗi
    res.status(500).json({ message: "Lỗi khi đăng ký" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        code: "EMAIL_NOT_FOUND",
        message: "Không tìm thấy tài khoản với email này.",
        detail:
          "Vui lòng kiểm tra lại địa chỉ email (chính tả, khoảng trắng). Nếu chưa có tài khoản, bạn có thể đăng ký mới ở trang Đăng ký.",
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        code: "ACCOUNT_INACTIVE",
        message: "Tài khoản đã bị tạm khóa.",
        detail: "Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ của ViGo để được xử lý.",
      });
    }

    const ok = await bcrypt.compare(password, user.password!);
    if (!ok) {
      return res.status(400).json({
        code: "INVALID_PASSWORD",
        message: "Mật khẩu không đúng.",
        detail:
          "Hãy thử nhập lại mật khẩu, kiểm tra Caps Lock và không thêm khoảng trắng ở đầu hoặc cuối. Nếu quên mật khẩu, vui lòng liên hệ hỗ trợ để được hướng dẫn đặt lại.",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Không thể đăng nhập lúc này.",
      detail: "Máy chủ gặp sự cố tạm thời. Vui lòng thử lại sau vài phút.",
    });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  return res.json({
    status: "success",
    data: {
      user: req.user,
    },
  });
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const { name, email, avatarUrl } = req.body || {};

    const update: any = {};
    if (typeof name === "string") update.name = name.trim();
    if (typeof email === "string") update.email = email.trim().toLowerCase();
    if (typeof avatarUrl === "string") update.avatarUrl = avatarUrl.trim();

    if (update.email) {
      const exists = await User.findOne({ email: update.email, _id: { $ne: userId } }).select("_id");
      if (exists) return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    return res.json({
      status: "success",
      message: "Cập nhật thông tin thành công",
      data: { user },
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi cập nhật thông tin" });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Thiếu mật khẩu hiện tại hoặc mật khẩu mới" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải từ 6 ký tự" });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const ok = await bcrypt.compare(String(currentPassword), String((user as any).password));
    if (!ok) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

    const hash = await bcrypt.hash(String(newPassword), 10);
    (user as any).password = hash;
    await user.save();

    return res.json({
      status: "success",
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi đổi mật khẩu" });
  }
};