import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model"; // Nhớ thêm đuôi .js nếu project của bạn bắt buộc

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password,name, role } = req.body;

    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hash = await bcrypt.hash(password, 10);

    //  Cho phép truyền guide hoặc admin mặc định là user
    const validRoles = ["user", "admin", "guide"];
    const assignedRole = validRoles.includes(role) ? role : "user";

    const user = await User.create({
      name,
      email,
      password: hash,
      role: assignedRole,
    });

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

    // chặn đăng nhập nếu tài khoản đã bị xóa
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