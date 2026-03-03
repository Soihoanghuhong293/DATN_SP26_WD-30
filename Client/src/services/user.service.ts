import axios from "axios";

const API_URL = "http://localhost:5000/api/v1/admin";

export const getAllUsers = async () => {
  const res = await axios.get(`${API_URL}/users`);
  return res.data;
};