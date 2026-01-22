export interface ITour {
  _id: string;
  name: string;
  basePrice: number;
  duration: number;
  images: string[];
  schedule: {
      day: number;
      title: string;
      activities: string[];
  }[];
  // ... copy giống Backend
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}