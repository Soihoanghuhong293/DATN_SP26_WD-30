import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);
  await User.create({ email, password: hash });

  res.json({ message: "Đăng ký thành công" });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Sai email" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: "Sai mật khẩu" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    "SECRET_KEY",
    { expiresIn: "1d" }
  );

  res.json({ token, role: user.role });
};