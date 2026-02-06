export type TourStatus = 'draft' | 'active' | 'inactive';

export interface ITourScheduleItem {
  day: number;
  title: string;
  activities: string[];
}

export interface ITourPriceTier {
  title: string;
  amount: number;
  note?: string;
}

export interface ITour {
  // Backend exposes virtual id; _id may still exist depending on serializer
  id: string;
  _id?: string;

  category_id?: string;
  description: string;
  schedule: ITourScheduleItem[];
  images: string[];
  prices: ITourPriceTier[];
  policies: string[];
  suppliers: string[];
  price: number;
  status: TourStatus;
  created_at: string;
  update_at: string;
  duration_: number;

  // Optional / backward-compatible
  name?: string;
  slug?: string;
}

export interface ICategory {
  id: string;
  _id?: string;
  name: string;
  created_at: string;
  update_at: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface ToursListResponse {
  status: string;
  results: number;
  total?: number;
  page?: number;
  limit?: number;
  data: { tours: ITour[] };
}