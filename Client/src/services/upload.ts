import { api } from "./api";

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  const res = await api.post<{ status: string; data: { url: string } }>("/uploads/images", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data.url;
}

