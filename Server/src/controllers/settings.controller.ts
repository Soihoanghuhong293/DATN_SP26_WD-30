import type { Request, Response } from "express";
import SystemSettings from "../models/SystemSettings";
import type { AuthRequest } from "../middlewares/auth.middleware";

async function getSingletonSettings() {
  const existing = await SystemSettings.findOne();
  if (existing) return existing;
  return await SystemSettings.create({});
}

export const getSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getSingletonSettings();
    return res.json({
      status: "success",
      data: { settings },
    });
  } catch (e) {
    return res.status(500).json({ message: "Lỗi khi lấy cài đặt hệ thống" });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    // Admin guard is handled in route, but keep a safe check
    if (!req.user) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const { siteName, logoUrl, contactEmail, contactPhone } = req.body || {};

    const update: any = {};
    if (siteName !== undefined) update.siteName = String(siteName).trim();
    if (logoUrl !== undefined) update.logoUrl = String(logoUrl).trim();
    if (contactEmail !== undefined) update.contactEmail = String(contactEmail).trim();
    if (contactPhone !== undefined) update.contactPhone = String(contactPhone).trim();

    if (update.siteName !== undefined && !update.siteName) {
      return res.status(400).json({ message: "Tên website không được để trống" });
    }

    const settings = await SystemSettings.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return res.json({
      status: "success",
      message: "Đã cập nhật cài đặt hệ thống",
      data: { settings },
    });
  } catch (e) {
    return res.status(500).json({ message: "Lỗi khi cập nhật cài đặt hệ thống" });
  }
};

