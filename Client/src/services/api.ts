import axios from 'axios';
import type { ApiResponse, ICategory, ITour, ToursListResponse } from '../types/tour.types';
import type { IGuide, IGuideCreateRequest, IGuideUpdateRequest, IGuideRatingRequest, ITourHistoryRequest } from '../types/guide.types';
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

// ===== GUIDE API FUNCTIONS =====

export type GetGuidesParams = {
  page?: number;
  limit?: number;
  group_type?: string;
  health_status?: string;
  language?: string;
  search?: string;
};

export interface GuidesListResponse extends ApiResponse<{ guides: IGuide[] }> {
  data: {
    guides: IGuide[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export async function getGuides(params: GetGuidesParams = {}) {
  const res = await api.get<GuidesListResponse>(ENDPOINTS.guides, { params });
  return res.data;
}

export async function getGuide(id: string) {
  const res = await api.get<ApiResponse<{ guide: IGuide }>>(ENDPOINTS.guideById(id));
  return res.data;
}

export async function createGuide(payload: IGuideCreateRequest) {
  const res = await api.post<ApiResponse<{ guide: IGuide }>>(ENDPOINTS.guides, payload);
  return res.data;
}

export async function updateGuide(id: string, payload: IGuideUpdateRequest) {
  const res = await api.patch<ApiResponse<{ guide: IGuide }>>(ENDPOINTS.guideById(id), payload);
  return res.data;
}

export async function deleteGuide(id: string) {
  const res = await api.delete(ENDPOINTS.guideById(id));
  return res.data;
}

export async function addGuideRating(id: string, payload: IGuideRatingRequest) {
  const res = await api.post<ApiResponse<{ guide: IGuide }>>(ENDPOINTS.guideRating(id), payload);
  return res.data;
}

export async function addGuideTourHistory(id: string, payload: ITourHistoryRequest) {
  const res = await api.post<ApiResponse<{ guide: IGuide }>>(ENDPOINTS.guideTourHistory(id), payload);
  return res.data;
}

export async function getGuideStatistics() {
  const res = await api.get<ApiResponse<{ groupStats: any[]; healthStats: any[] }>>(ENDPOINTS.guideStatistics);
  return res.data;
}


