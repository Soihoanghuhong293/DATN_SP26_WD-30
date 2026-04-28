import type { Request, Response } from "express";
import SystemSettings from "../models/SystemSettings";
import type { AuthRequest } from "../middlewares/auth.middleware";

const DEFAULT_SYSTEM_SETTINGS = {
  siteName: "ViGo",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
} as const;

async function getSingletonSettings() {
  const existing = await SystemSettings.findOne();
  if (existing) return existing;
  return await SystemSettings.create(DEFAULT_SYSTEM_SETTINGS);
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

    const { logoUrl, contactEmail, contactPhone } = req.body || {};

    const update: any = {};
    if (logoUrl !== undefined) update.logoUrl = String(logoUrl).trim();
    if (contactEmail !== undefined) update.contactEmail = String(contactEmail).trim();
    if (contactPhone !== undefined) update.contactPhone = String(contactPhone).trim();

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

export const resetSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const settings = await SystemSettings.findOneAndUpdate({}, DEFAULT_SYSTEM_SETTINGS, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return res.json({
      status: "success",
      message: "Đã khôi phục cài đặt hệ thống về mặc định",
      data: { settings },
    });
  } catch (e) {
    return res.status(500).json({ message: "Lỗi khi khôi phục cài đặt hệ thống" });
  }
};

