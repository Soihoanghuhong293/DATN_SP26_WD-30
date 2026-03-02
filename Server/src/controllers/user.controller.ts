import { Request, Response } from "express";
import User from "../models/user.model";

// 1. Lấy danh sách tài khoản
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({
      message: "Lấy danh sách thành công",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách user" });
  }
};

// 2. Thay đổi quyền (Role)
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Quyền không hợp lệ" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    res.json({ message: "Cập nhật quyền thành công", data: user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật quyền" });
  }
};

// 3. Khóa / Mở khóa tài khoản (Status)
export const toggleStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    user.status = user.status === "active" ? "inactive" : "active";
    await user.save();

    res.json({ 
      message: `Tài khoản đã ${user.status === "active" ? "mở khóa" : "bị khóa"}`, 
      data: { id: user._id, email: user.email, status: user.status } 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật trạng thái" });
  }
};

// 4. Xóa user (Tùy chọn)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json({ message: "Đã xóa tài khoản" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa tài khoản" });
  }
};