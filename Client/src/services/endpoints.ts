export const ENDPOINTS = {
  tours: '/tours',
  tourById: (id: string) => `/tours/${id}`,
  categories: '/categories',
  categoryById: (id: string) => `/categories/${id}`,
} as const;


