import { Request, Response } from "express";
import User from "../models/user.model";
import Guide from "../models/Guide";

//Lấy danh sách user
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({
      status: "success",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách" });
  }
};

// sét quyền
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!["user", "admin", "guide", "hdv"].includes(role)) {
      return res.status(400).json({ message: "Quyền không hợp lệ" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    // Đồng bộ: nếu user được set role guide/hdv mà chưa có Guide doc thì tạo
    if (role === "guide" || role === "hdv") {
      const exists = await Guide.findOne({ user_id: user._id }).select("_id");
      if (!exists) {
        await Guide.create({
          user_id: user._id,
          name: (user as any).name || (user as any).email || "Hướng dẫn viên",
          email: (user as any).email,
          phone: `AUTO-${String(user._id)}`,
          languages: ["Vietnamese"],
          experience: { years: 0 },
          group_type: "domestic",
          health_status: "healthy",
          history: [],
          rating: { average: 0, totalReviews: 0, reviews: [] },
        });
      }
    }

    res.json({ status: "success", message: "Cập nhật quyền thành công", data: user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật quyền" });
  }
};

// khóa mở tài khoản
export const toggleStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    user.status = user.status === "active" ? "inactive" : "active";
    await user.save();

    res.json({ 
      status: "success",
      message: `Tài khoản đã ${user.status === "active" ? "mở khóa" : "bị khóa"}`, 
      data: user 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật trạng thái" });
  }
};

// zxóa vĩnh viễn
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json({ status: "success", message: "Đã xóa tài khoản" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa tài khoản" });
  }
};