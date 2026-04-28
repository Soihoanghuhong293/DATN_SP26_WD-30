import { api } from "./api";
import { uploadImage } from "./upload";

export type SystemSettings = {
  _id: string;
  siteName: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export async function getSystemSettings() {
  const res = await api.get<{ status: string; data: { settings: SystemSettings } }>("/settings");
  return res.data.data.settings;
}

export async function updateSystemSettings(payload: Partial<Omit<SystemSettings, "_id">>) {
  const res = await api.patch<{ status: string; message?: string; data: { settings: SystemSettings } }>(
    "/settings",
    payload
  );
  return res.data.data.settings;
}

export async function resetSystemSettings() {
  const res = await api.post<{ status: string; message?: string; data: { settings: SystemSettings } }>("/settings/reset");
  return res.data.data.settings;
}

export async function uploadSystemLogo(file: File) {
  return uploadImage(file);
}

