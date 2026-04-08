import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js"; 
import Guide from "../models/Guide.js"; // 👈 THÊM IMPORT NÀY

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
      return res.status(400).json({ message: "Sai email" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa bởi Admin" });
    }

    const ok = await bcrypt.compare(password, user.password!);
    if (!ok) {
      return res.status(400).json({ message: "Sai mật khẩu" });
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
    res.status(500).json({ message: "Lỗi khi đăng nhập" });
  }
};