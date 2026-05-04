import dayjs from "dayjs";

/** Mốc thời gian ngày kết thúc tour (cuối ngày inclusive), ưu tiên endDate booking nếu có. */
export function tripEndMs(
  startYmd: string,
  durationDays: number | undefined,
  bookingEndDate?: string | null
): number {
  const start = dayjs(startYmd).startOf("day");
  const dur = Math.max(1, Number(durationDays) || 1);
  const impliedEnd = start.add(dur - 1, "day");
  if (bookingEndDate) {
    const fromBooking = dayjs(bookingEndDate).startOf("day");
    return Math.max(impliedEnd.valueOf(), fromBooking.valueOf());
  }
  return impliedEnd.valueOf();
}

/**
 * Giai đoạn hiển thị theo ngày thực tế + tour_stage:
 * — Đã qua ngày cuối tour → completed
 * — Chưa tới ngày khởi hành → scheduled
 * — Trong kỳ tour: theo stage booking hoặc in_progress nếu vẫn scheduled
 */
export function effectiveTripStage(
  startYmd: string,
  durationDays: number | undefined,
  bookingStages: string[],
  endMs: number
): "scheduled" | "in_progress" | "completed" {
  const start = dayjs(startYmd).startOf("day");
  const end = dayjs(endMs).startOf("day");
  const today = dayjs().startOf("day");

  const norm = (s: string) => String(s || "scheduled").toLowerCase();
  const stages = bookingStages.length ? bookingStages.map(norm) : ["scheduled"];

  if (today.isAfter(end, "day")) {
    return "completed";
  }

  if (today.isBefore(start, "day")) {
    return "scheduled";
  }

  if (stages.every((s) => s === "completed")) return "completed";
  if (stages.some((s) => s === "in_progress")) return "in_progress";
  return "in_progress";
}
