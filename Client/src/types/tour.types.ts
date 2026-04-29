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
  duration_?: number;
  duration_days?: number;

  // Optional / backward-compatible
  name?: string;
  slug?: string;
  rating?: {
    average?: number;
    total_reviews?: number;
  };
}

export type CategoryStatus = 'active' | 'inactive';

export interface ICategory {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  children?: ICategory[];
  status?: CategoryStatus;
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
  // Server currently returns `data` as an array of tours.
  data: ITour[];
}