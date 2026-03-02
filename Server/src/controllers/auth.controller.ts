import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hash,
      role: role === "admin" ? "admin" : "user",
    });

    res.json({
      message: "Đăng ký thành công",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Register failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Sai email" });
    }

    // 👈 QUAN TRỌNG: Chặn đăng nhập nếu bị Admin khóa
    if (user.status === "inactive") {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa" });
    }

    const ok = await bcrypt.compare(password, user.password!);
    if (!ok) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      "SECRET_KEY", // Lưu ý: Đưa secret key này ra file .env ở môi trường thực tế nhé
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
};