import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js"; 
import Guide from "../models/Guide.js"; 

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // trùng email
    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hash = await bcrypt.hash(password, 10);
    const validRoles = ["user", "admin", "guide"];
    const assignedRole = validRoles.includes(role) ? role : "user";

    //tạo tk login
    const user = await User.create({
      name,
      email,
      password: hash,
      role: assignedRole,
    });

    // nếu là hdv tự động tạo trong qly hdv
    if (assignedRole === "guide") {
      try {
        await Guide.create({
          user_id: user._id, 
          name: user.name,   
          email: user.email, 
        });
      } catch (guideError) {
        // nếu tạo bảng Guide thất bại xóa luôn useer
        await User.findByIdAndDelete(user._id);
        console.error("Lỗi DB khi tạo bảng Guide:", guideError);
        return res.status(500).json({ message: "Lỗi đồng bộ dữ liệu HDV. Vui lòng thử lại!" });
      }
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
    console.error("Lỗi đăng ký tổng thể:", error); 
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký" });
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