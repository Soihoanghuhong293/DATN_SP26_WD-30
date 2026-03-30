export const ENDPOINTS = {
  tours: '/tours',
  tourById: (id: string) => `/tours/${id}`,
  categories: '/categories',
  categoryTree: '/categories/tree',
  categoryById: (id: string) => `/categories/${id}`,
  guides: '/guides',
  guideById: (id: string) => `/guides/${id}`,
  guideRating: (id: string) => `/guides/${id}/rating`,
  guideTourHistory: (id: string) => `/guides/${id}/history`,
  guideStatistics: '/guides/statistics',
  providers: '/providers',
  providerById: (id: string) => `/providers/${id}`,
  vehicles: '/vehicles',
  vehicleById: (id: string) => `/vehicles/${id}`,
} as const;


