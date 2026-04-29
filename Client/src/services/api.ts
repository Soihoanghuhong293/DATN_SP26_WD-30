import axios from 'axios';
import type { ApiResponse, ICategory, ITour, ToursListResponse } from '../types/tour.types';
import type { IGuide, IGuideCreateRequest, IGuideUpdateRequest, IGuideRatingRequest, ITourHistoryRequest } from '../types/guide.types';
import type {
  CreateProviderPayload,
  IProvider,
  IVehicle,
  IHotel,
  IRoom,
  IRestaurant,
  IProviderTicket,
  TicketApplicationMode,
} from '../types/provider.types';
import { ENDPOINTS } from './endpoints';
import { authStorage } from '../auth/authStorage';

const baseURL =
  (import.meta as any)?.env?.VITE_API_URL ||
  'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token for this axios instance too
api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    const headers = (config.headers ?? {}) as any;
    if (!headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
  }
  return config;
});

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token') || ''}`,
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

// ===== HOTEL & ROOM (theo nhà cung cấp) =====

export type GetHotelsParams = { provider_id?: string };

export async function getHotels(params: GetHotelsParams = {}) {
  const res = await api.get<ApiResponse<{ hotels: IHotel[] }> & { results?: number }>(ENDPOINTS.hotels, {
    params,
  });
  return res.data;
}

export type UpsertHotelPayload = {
  name: string;
  address?: string;
  provider_id?: string;
  status?: 'active' | 'inactive';
};

export async function createHotel(payload: UpsertHotelPayload) {
  const res = await api.post<ApiResponse<{ hotel: IHotel }>>(ENDPOINTS.hotels, payload);
  return res.data;
}

export async function deleteHotel(id: string) {
  const res = await api.delete(ENDPOINTS.hotelById(id));
  return res.data;
}

export type GetRoomsParams = { provider_id?: string; hotel_id?: string };

export async function getRooms(params: GetRoomsParams = {}) {
  const res = await api.get<ApiResponse<{ rooms: IRoom[] }> & { results?: number }>(ENDPOINTS.rooms, {
    params,
  });
  return res.data;
}

export type UpsertRoomPayload = {
  hotel_id: string;
  room_number: string;
  max_occupancy?: number;
  status?: 'active' | 'inactive';
  provider_id?: string;
};

export async function createRoom(payload: UpsertRoomPayload) {
  const res = await api.post<ApiResponse<{ room: IRoom }>>(ENDPOINTS.rooms, payload);
  return res.data;
}

export async function deleteRoom(id: string) {
  const res = await api.delete(ENDPOINTS.roomById(id));
  return res.data;
}

// ===== RESTAURANTS (theo nhà cung cấp) =====

export type GetRestaurantsParams = { provider_id?: string };

export async function getRestaurants(params: GetRestaurantsParams = {}) {
  const res = await api.get<ApiResponse<{ restaurants: IRestaurant[] }> & { results?: number }>(ENDPOINTS.restaurants, {
    params,
  });
  return res.data;
}

export type UpsertRestaurantPayload = {
  name: string;
  phone?: string;
  capacity: number;
  location?: string;
  provider_id?: string;
  status?: 'active' | 'inactive';
};

export async function createRestaurant(payload: UpsertRestaurantPayload) {
  const res = await api.post<ApiResponse<{ restaurant: IRestaurant }>>(ENDPOINTS.restaurants, payload);
  return res.data;
}

export async function deleteRestaurant(id: string) {
  const res = await api.delete(ENDPOINTS.restaurantById(id));
  return res.data;
}

// ===== VÉ (theo nhà cung cấp) =====

export type GetProviderTicketsParams = { provider_id?: string };

export async function getProviderTickets(params: GetProviderTicketsParams = {}) {
  const res = await api.get<ApiResponse<{ tickets: IProviderTicket[] }> & { results?: number }>(
    ENDPOINTS.providerTickets,
    { params }
  );
  return res.data;
}

export type UpsertProviderTicketPayload = {
  name: string;
  ticket_type: string;
  price_adult: number;
  price_child: number;
  application_mode: TicketApplicationMode;
  provider_id?: string;
  status?: 'active' | 'inactive';
};

export async function createProviderTicket(payload: UpsertProviderTicketPayload) {
  const res = await api.post<ApiResponse<{ ticket: IProviderTicket }>>(ENDPOINTS.providerTickets, payload);
  return res.data;
}

export async function deleteProviderTicket(id: string) {
  const res = await api.delete(ENDPOINTS.providerTicketById(id));
  return res.data;
}

// ===== TOUR REVIEW API FUNCTIONS =====

export type TourReviewStatus = 'pending' | 'approved' | 'hidden';

export type TourReviewPayload = {
  booking_id: string;
  rating: number;
  guide_rating?: number;
  comment?: string;
  images?: string[];
};

export type UpdateTourReviewPayload = Partial<Omit<TourReviewPayload, 'booking_id'>>;

export async function getMyTourReviewByBooking(bookingId: string) {
  const res = await api.get(ENDPOINTS.tourReviews + '/me', {
    ...getAuthConfig(),
    params: { booking_id: bookingId },
  });
  return res.data;
}

export async function createTourReview(payload: TourReviewPayload) {
  const res = await api.post(ENDPOINTS.tourReviews, payload, getAuthConfig());
  return res.data;
}

export async function updateTourReview(id: string, payload: UpdateTourReviewPayload) {
  const res = await api.put(ENDPOINTS.tourReviewMeById(id), payload, getAuthConfig());
  return res.data;
}

export async function deleteTourReview(id: string) {
  const res = await api.delete(ENDPOINTS.tourReviewMeById(id), getAuthConfig());
  return res.data;
}

export async function getTourReviewsByTour(tourId: string) {
  const res = await api.get(ENDPOINTS.tourReviewPublicList, {
    params: { tour_id: tourId },
  });
  return res.data;
}

export async function adminGetTourReviews(params: {
  status?: TourReviewStatus;
  rating?: number;
  tour_id?: string;
  guide_user_id?: string;
  q?: string;
} = {}) {
  const res = await api.get(ENDPOINTS.tourReviews, { ...getAuthConfig(), params });
  return res.data;
}

export async function adminUpdateTourReviewStatus(id: string, status: TourReviewStatus) {
  const res = await api.patch(`${ENDPOINTS.tourReviewById(id)}/status`, { status }, getAuthConfig());
  return res.data;
}

export async function adminDeleteTourReview(id: string) {
  const res = await api.delete(ENDPOINTS.tourReviewById(id), getAuthConfig());
  return res.data;
}


// ===== WISHLIST TOUR =====

export type WishlistStatusResponse = ApiResponse<{ isWishlisted: boolean }> & {
  data?: { isWishlisted: boolean };
};

export async function getWishlistTourStatus(tourId: string) {
  const res = await api.get(ENDPOINTS.wishlistTourStatus(tourId));
  return res.data as WishlistStatusResponse;
}

export async function addWishlistTour(tourId: string) {
  const res = await api.post(ENDPOINTS.wishlistTourById(tourId));
  return res.data;
}

export async function removeWishlistTour(tourId: string) {
  const res = await api.delete(ENDPOINTS.wishlistTourById(tourId));
  return res.data;
}

export async function getMyWishlistTours() {
  const res = await api.get(ENDPOINTS.wishlistTours);
  return res.data;
}
