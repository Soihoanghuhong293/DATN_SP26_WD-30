export const ENDPOINTS = {
  tours: '/tours',
  tourById: (id: string) => `/tours/${id}`,
  categories: '/categories',
  guides: '/guides',
  guideById: (id: string) => `/guides/${id}`,
  guideRating: (id: string) => `/guides/${id}/rating`,
  guideTourHistory: (id: string) => `/guides/${id}/history`,
  guideStatistics: '/guides/statistics',
} as const;


