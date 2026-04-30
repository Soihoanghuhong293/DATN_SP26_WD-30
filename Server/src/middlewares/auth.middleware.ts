import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");

    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.status === "inactive") {
      return res.status(401).json({ message: "Tài khoản không tồn tại hoặc đã bị khóa" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

export const restrictToAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ Quản trị viên mới có quyền thực hiện" });
  }
  next();
};

export const restrictToGuide = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user.role !== "guide" && req.user.role !== "hdv") {
    return res.status(403).json({ message: "Chỉ Hướng dẫn viên mới có quyền thực hiện" });
  }
  next();
};

export const restrictToGuideOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = String(req.user?.role || '');
  if (role !== 'admin' && role !== 'guide' && role !== 'hdv') {
    return res.status(403).json({ message: "Chỉ Quản trị viên / Hướng dẫn viên mới có quyền thực hiện" });
  }
  next();
};

export const optionalProtect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return next();

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    const user = await User.findById(decoded.id).select("-password");
    if (user && user.status !== "inactive") {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
};

export const protectOptional = optionalProtect;