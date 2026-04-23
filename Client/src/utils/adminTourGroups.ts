import dayjs from "dayjs";

/** Chuẩn hoá tên hiển thị (bỏ hậu tố ngày / copy) — cùng logic ToursPage */
export function normalizeTourDisplayName(name?: string): string {
  const n = String(name || "").trim();
  if (!n) return "";
  return n
    .replace(/\s*\(\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\)\s*$/i, "")
    .replace(/\s*\(\s*copy\s*\)\s*$/i, "")
    .trim();
}

export function getTourTemplateIdString(t: any): string {
  const tid = t?.template_id;
  if (tid == null || tid === "") return "";
  if (typeof tid === "object" && tid._id != null) return String(tid._id);
  return String(tid);
}

/** Ưu tiên cùng template_id, không có thì cùng tên chuẩn hoá */
export function getTourGroupKey(t: any): string {
  const tpl = getTourTemplateIdString(t);
  if (tpl) return `tpl:${tpl}`;
  const nameKey = normalizeTourDisplayName(t?.name);
  if (nameKey) return `name:${nameKey}`;
  return `id:${t?._id || t?.id || "unknown"}`;
}

export function normalizeDepartureDateStr(raw: any): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (s.includes("T")) return s.split("T")[0];
  const parsed = dayjs(s);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
}

export type GroupedTourAdmin = any & {
  _instances: any[];
  _groupKey: string;
};

/** Gộp các document Tour (cùng template / cùng tên) cho màn admin tạo booking */
export function groupToursForAdminBooking(tours: any[]): GroupedTourAdmin[] {
  const list = Array.isArray(tours) ? tours : [];
  const byKey = new Map<string, any[]>();
  for (const t of list) {
    const k = getTourGroupKey(t);
    const arr = byKey.get(k) || [];
    arr.push(t);
    byKey.set(k, arr);
  }

  return Array.from(byKey.entries()).map(([groupKey, group]) => {
    const sorted = [...group].sort((a, b) => {
      const ad = normalizeDepartureDateStr(a?.departure_schedule?.[0]?.date);
      const bd = normalizeDepartureDateStr(b?.departure_schedule?.[0]?.date);
      const av = ad ? dayjs(ad).valueOf() : Number.MAX_SAFE_INTEGER;
      const bv = bd ? dayjs(bd).valueOf() : Number.MAX_SAFE_INTEGER;
      return av - bv;
    });
    const rep = sorted[0];
    const displayName = normalizeTourDisplayName(rep?.name) || rep?.name || "";
    return {
      ...rep,
      name: displayName,
      _instances: group,
      _groupKey: groupKey,
    };
  });
}

/** Gộp lịch khởi hành từ nhiều instance; cùng ngày → cộng chỗ; giữ instance đầu gặp làm primary */
export function mergeDepartureRowsForInstances(instances: any[]): {
  dateStr: string;
  baseSlots: number;
  primaryInstance: any;
}[] {
  const byDate = new Map<string, { baseSlots: number; primaryInstance: any }>();
  for (const inst of instances || []) {
    const sch = Array.isArray(inst?.departure_schedule) ? inst.departure_schedule : [];
    for (const row of sch) {
      const dateStr = normalizeDepartureDateStr(row?.date);
      if (!dateStr) continue;
      const slots = Number(row?.slots ?? 0);
      const cur = byDate.get(dateStr);
      if (!cur) byDate.set(dateStr, { baseSlots: slots, primaryInstance: inst });
      else
        byDate.set(dateStr, {
          baseSlots: cur.baseSlots + slots,
          primaryInstance: cur.primaryInstance,
        });
    }
  }
  return Array.from(byDate.entries())
    .map(([dateStr, v]) => ({ dateStr, ...v }))
    .sort((a, b) => dayjs(a.dateStr).valueOf() - dayjs(b.dateStr).valueOf());
}

/** Instance thật sự chứa ngày khởi hành (document Tour gắn booking) */
export function getTourInstanceForDepartureDate(instances: any[], dateRaw: any): any | null {
  const ymd = normalizeDepartureDateStr(dateRaw);
  if (!ymd) return null;
  for (const inst of instances || []) {
    const sch = Array.isArray(inst?.departure_schedule) ? inst.departure_schedule : [];
    for (const row of sch) {
      if (normalizeDepartureDateStr(row?.date) === ymd) return inst;
    }
  }
  return null;
}
