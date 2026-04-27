import { api } from "./api";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  status: "active" | "inactive";
};

export async function getMe() {
  const res = await api.get<{ status: string; data: { user: AuthUser } }>("/auth/me");
  return res.data.data.user;
}

export async function updateMe(payload: { name?: string; email?: string; avatarUrl?: string }) {
  const res = await api.patch<{ status: string; message?: string; data: { user: AuthUser } }>(
    "/auth/me",
    payload
  );
  return res.data.data.user;
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  const res = await api.patch<{ status: string; message?: string }>("/auth/change-password", payload);
  return res.data;
}

