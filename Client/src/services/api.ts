import axios from 'axios';
import type { ApiResponse, ICategory, ITour, ToursListResponse } from '../types/tour.types';
import { ENDPOINTS } from './endpoints';

const baseURL =
  (import.meta as any)?.env?.VITE_API_URL ||
  'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type GetToursParams = {
  page?: number;
  limit?: number;
  status?: string;
  category_id?: string;
  search?: string;
};

export async function getTours(params: GetToursParams = {}) {
  const res = await api.get<ToursListResponse>(ENDPOINTS.tours, { params });
  return res.data;
}

export async function getTour(id: string) {
  const res = await api.get<ApiResponse<{ tour: ITour }>>(ENDPOINTS.tourById(id));
  return res.data;
}

export type UpsertTourPayload = Partial<ITour> & {
  description: string;
  price: number;
  duration_: number;
};

export async function createTour(payload: UpsertTourPayload) {
  const res = await api.post<ApiResponse<{ tour: ITour }>>(ENDPOINTS.tours, payload);
  return res.data;
}

export async function updateTour(id: string, payload: Partial<UpsertTourPayload>) {
  const res = await api.patch<ApiResponse<{ tour: ITour }>>(ENDPOINTS.tourById(id), payload);
  return res.data;
}

export async function deleteTour(id: string) {
  const res = await api.delete(ENDPOINTS.tourById(id));
  return res.data;
}

export async function getCategories() {
  const res = await api.get<ApiResponse<{ categories: ICategory[] }> & { results?: number }>(
    ENDPOINTS.categories
  );
  return res.data;
}

export async function createCategory(name: string) {
  const res = await api.post<ApiResponse<{ category: ICategory }>>(ENDPOINTS.categories, { name });
  return res.data;
}


