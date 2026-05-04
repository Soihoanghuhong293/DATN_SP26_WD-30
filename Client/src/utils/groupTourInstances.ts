import dayjs from 'dayjs';
import type { ITour } from '../types/tour.types';

/** Chuẩn hoá tên tour để gộp các instance cùng sản phẩm (bỏ hậu tố ngày / copy). */
export function normalizeTourGroupName(name?: string): string {
  const n = String(name || '').trim();
  if (!n) return '';
  return n
    .replace(/\s*\(\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\)\s*$/i, '')
    .replace(/\s*\(\s*copy\s*\)\s*$/i, '')
    .trim();
}

/**
 * Gộp danh sách instance (nhiều ngày khởi hành) thành một card / tour đại diện mỗi tên.
 * Giữ `_instances` trên object đại diện (dùng ở trang chi tiết nếu cần).
 */
export function groupTourInstances(instances: ITour[]): ITour[] {
  const byName = new Map<string, ITour[]>();
  for (const t of instances) {
    const groupKey = normalizeTourGroupName(t.name);
    if (!groupKey) continue;
    const arr = byName.get(groupKey) || [];
    arr.push(t);
    byName.set(groupKey, arr);
  }

  const grouped: ITour[] = Array.from(byName.entries()).map(([groupKey, group]) => {
    const sorted = [...group].sort((a: any, b: any) => {
      const aDate = String((a as any)?.departure_schedule?.[0]?.date || '').slice(0, 10);
      const bDate = String((b as any)?.departure_schedule?.[0]?.date || '').slice(0, 10);
      const av = aDate ? dayjs(aDate).valueOf() : Number.MAX_SAFE_INTEGER;
      const bv = bDate ? dayjs(bDate).valueOf() : Number.MAX_SAFE_INTEGER;
      return av - bv;
    });
    const rep = sorted[0] || group[0];
    const anyWithImage = group.find((x) => Array.isArray(x.images) && x.images.length > 0);
    const images = (rep.images?.length ? rep.images : anyWithImage?.images) || [];

    return {
      ...rep,
      name: groupKey,
      images,
      ...({ _instances: group } as any),
    } as ITour;
  });

  grouped.sort((a: any, b: any) => {
    const av = a.created_at ? dayjs(a.created_at).valueOf() : 0;
    const bv = b.created_at ? dayjs(b.created_at).valueOf() : 0;
    return bv - av;
  });

  return grouped;
}
