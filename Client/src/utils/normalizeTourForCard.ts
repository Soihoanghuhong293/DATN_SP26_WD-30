import type { ITour, ITourScheduleItem, TourStatus } from '../types/tour.types';

/**
 * Chuẩn hoá payload API (id/_id, field thiếu) để dùng với TourCard.
 */
export function normalizeTourForCard(raw: Record<string, unknown> | null | undefined): ITour {
  const r = (raw || {}) as Record<string, unknown>;
  const id = String(r.id ?? r._id ?? '').trim();
  const rawSchedule = Array.isArray(r.schedule) ? r.schedule : [];
  const schedule: ITourScheduleItem[] = rawSchedule.map((item: unknown) => {
    const it = (item || {}) as Record<string, unknown>;
    return {
      day: Number(it.day ?? 0),
      title: String(it.title ?? ''),
      activities: Array.isArray(it.activities) ? (it.activities as string[]) : [],
    };
  });

  return {
    id,
    _id: r._id as string | undefined,
    category_id: r.category_id as string | undefined,
    description: String(r.description ?? ''),
    schedule,
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    prices: Array.isArray(r.prices) ? (r.prices as ITour['prices']) : [],
    policies: Array.isArray(r.policies) ? (r.policies as string[]) : [],
    suppliers: Array.isArray(r.suppliers) ? (r.suppliers as string[]) : [],
    price: Number(r.price ?? 0),
    status: (r.status as TourStatus) || 'active',
    created_at: String(r.created_at ?? ''),
    update_at: String(r.update_at ?? r['updated_at'] ?? ''),
    duration_: r.duration_ as number | undefined,
    duration_days: (r.duration_days ?? r.durationDays) as number | undefined,
    name: r.name as string | undefined,
    slug: r.slug as string | undefined,
    rating: r.rating as ITour['rating'],
    location: r.location as string | undefined,
    destination: r.destination as string | undefined,
    city: r.city as string | undefined,
    province: r.province as string | undefined,
    serviceLevel: r.serviceLevel as string | undefined,
    service_level: r.service_level as string | undefined,
  };
}
