import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

/**
 * REGISTER
 * - Mặc định user là "user"
 * - Có thể tạo admin qua Postman bằng cách gửi role = "admin"
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    // Check email tồn tại
    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hash,
      role: role === "admin" ? "admin" : "user", // 👈 QUAN TRỌNG
    });

    res.json({
      message: "Đăng ký thành công",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Register failed" });
  }
};

/**
 * LOGIN
 * - Lấy role trực tiếp từ database
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Sai email" });
    }

    // Check password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      "SECRET_KEY",
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