import axios from "axios";

const API_URL = "http://localhost:5000/api/v1/auth";

export const registerAPI = (data: {
  name: string;
  email: string;
  password: string;
}) => {
  return axios.post(`${API_URL}/register`, data);
};

export const loginAPI = (data: {
  email: string;
  password: string;
}) => {
  return axios.post(`${API_URL}/login`, data);
};