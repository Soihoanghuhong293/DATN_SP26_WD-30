import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

// Mở rộng Request để chứa thông tin user
export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    // Giải mã token
    const decoded: any = jwt.verify(token, "SECRET_KEY");

    // Tìm user và đưa vào request
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.status === "inactive") {
      return res.status(401).json({ message: "User không tồn tại hoặc đã bị khóa" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

// Middleware kiểm tra quyền
export const restrictToAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền truy cập chức năng này" });
  }
  next();
};