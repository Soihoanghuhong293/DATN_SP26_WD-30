import axios from 'axios';
import type { ApiResponse, ICategory, ITour, ToursListResponse } from '../types/tour.types';
import type { IGuide, IGuideCreateRequest, IGuideUpdateRequest, IGuideRatingRequest, ITourHistoryRequest } from '../types/guide.types';
import type { CreateProviderPayload, IProvider, IVehicle } from '../types/provider.types';
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
  minPrice?: number;
  maxPrice?: number;
  departureDate?: string;
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

export type GetCategoriesParams = {
  status?: string;
  search?: string;
};

export async function getCategories(params: GetCategoriesParams = {}) {
  const res = await api.get<ApiResponse<{ categories: ICategory[] }> & { results?: number }>(
    ENDPOINTS.categories,
    { params }
  );
  return res.data;
}

export async function getCategoryTree(params: GetCategoriesParams = {}) {
  const res = await api.get<ApiResponse<{ categories: ICategory[] }> & { results?: number }>(
    ENDPOINTS.categoryTree,
    { params }
  );
  return res.data;
}

export async function getCategory(id: string) {
  const res = await api.get<ApiResponse<{ category: ICategory }>>(ENDPOINTS.categoryById(id));
  return res.data;
}

export type CreateCategoryPayload = {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
  parent_id?: string | null;
};

export async function createCategory(payload: CreateCategoryPayload) {
  const res = await api.post<ApiResponse<{ category: ICategory }>>(ENDPOINTS.categories, payload);
  return res.data;
}

export async function updateCategory(id: string, payload: Partial<CreateCategoryPayload>) {
  const res = await api.patch<ApiResponse<{ category: ICategory }>>(
    ENDPOINTS.categoryById(id),
    payload
  );
  return res.data;
}

export async function deleteCategory(id: string) {
  const res = await api.delete(ENDPOINTS.categoryById(id));
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

// ===== PROVIDER API FUNCTIONS =====

export type GetProvidersParams = {
  status?: string;
  search?: string;
};

export async function getProviders(params: GetProvidersParams = {}) {
  const res = await api.get<ApiResponse<{ providers: IProvider[] }> & { results?: number }>(
    ENDPOINTS.providers,
    { params }
  );
  return res.data;
}

export async function getProvider(id: string) {
  const res = await api.get<ApiResponse<{ provider: IProvider }>>(ENDPOINTS.providerById(id));
  return res.data;
}

export async function createProvider(payload: CreateProviderPayload) {
  const res = await api.post<ApiResponse<{ provider: IProvider }>>(ENDPOINTS.providers, payload);
  return res.data;
}

export async function updateProvider(id: string, payload: Partial<CreateProviderPayload>) {
  const res = await api.patch<ApiResponse<{ provider: IProvider }>>(
    ENDPOINTS.providerById(id),
    payload
  );
  return res.data;
}

export async function deleteProvider(id: string) {
  const res = await api.delete(ENDPOINTS.providerById(id));
  return res.data;
}

// ===== VEHICLE API FUNCTIONS =====

export type GetVehiclesParams = {
  provider_id?: string;
};

export async function getVehicles(params: GetVehiclesParams = {}) {
  const res = await api.get<ApiResponse<{ vehicles: IVehicle[] }> & { results?: number }>(
    ENDPOINTS.vehicles,
    { params }
  );
  return res.data;
}

export type UpsertVehiclePayload = {
  plate: string;
  capacity: number;
  status?: 'active' | 'inactive';
  provider_id?: string;
};

export async function createVehicle(payload: UpsertVehiclePayload) {
  const res = await api.post<ApiResponse<{ vehicle: IVehicle }>>(ENDPOINTS.vehicles, payload);
  return res.data;
}

export async function updateVehicle(id: string, payload: Partial<UpsertVehiclePayload>) {
  const res = await api.patch<ApiResponse<{ vehicle: IVehicle }>>(ENDPOINTS.vehicleById(id), payload);
  return res.data;
}

export async function deleteVehicle(id: string) {
  const res = await api.delete(ENDPOINTS.vehicleById(id));
  return res.data;
}


