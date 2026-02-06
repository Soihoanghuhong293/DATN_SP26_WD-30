export const ENDPOINTS = {
  tours: '/tours',
  tourById: (id: string) => `/tours/${id}`,
  categories: '/categories',
} as const;


