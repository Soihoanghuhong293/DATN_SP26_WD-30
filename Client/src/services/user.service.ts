import axios from "axios";

const API_URL = "http://localhost:5000/api/v1/admin/users";

// lấy danh sách user
export const getAllUsers = async () => {
  const res = await axios.get(API_URL);
  return res.data;
};

// tạo user
export const createUser = async (data: any) => {
  const res = await axios.post(API_URL, data);
  return res.data;
};

// cập nhật user
export const updateUser = async (id: string, data: any) => {
  const res = await axios.put(`${API_URL}/${id}`, data);
  return res.data;
};

// xóa user
export const deleteUser = async (id: string) => {
  const res = await axios.delete(`${API_URL}/${id}`);
  return res.data;
};