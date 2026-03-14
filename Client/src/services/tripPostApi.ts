import axios from './api'; // Import axios instance từ api.ts nếu có, hoặc dùng axios trực tiếp

// Base URL cho TripPost API
const TRIP_POST_BASE_URL = '/api/v1/trip-posts';

// Lấy danh sách bài viết của một booking
export const getTripPosts = async (bookingId: string) => {
  const response = await axios.get(`${TRIP_POST_BASE_URL}?booking_id=${bookingId}`);
  return response.data;
};

// Lấy chi tiết một bài viết
export const getTripPost = async (id: string) => {
  const response = await axios.get(`${TRIP_POST_BASE_URL}/${id}`);
  return response.data;
};

// Tạo bài viết mới
export const createTripPost = async (data: {
  booking_id: string;
  title: string;
  content: string;
  images?: string[];
  status: 'public' | 'private' | 'draft';
}) => {
  const response = await axios.post(TRIP_POST_BASE_URL, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } // Auth nếu cần
  });
  return response.data;
};

// Cập nhật bài viết
export const updateTripPost = async (id: string, data: Partial<{
  title: string;
  content: string;
  images: string[];
  status: 'public' | 'private' | 'draft';
}>) => {
  const response = await axios.put(`${TRIP_POST_BASE_URL}/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

// Xóa bài viết
export const deleteTripPost = async (id: string) => {
  const response = await axios.delete(`${TRIP_POST_BASE_URL}/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};