import { api } from "./api";

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

export async function uploadSystemLogo(file: File) {
  const form = new FormData();
  form.append("image", file);
  const res = await api.post<{ status: string; data: { url: string } }>("/uploads/images", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data.url;
}

