/** Khớp logic `resolveEffectivePaymentForBooking` trên server — tránh UI disable nút xóa sai. */

const LEGACY_PAYMENT_STATUS_MAP: Record<string, 'unpaid' | 'deposit' | 'paid' | 'refunded'> = {
  pending: 'unpaid',
  confirmed: 'unpaid',
  deposit: 'deposit',
  paid: 'paid',
  refunded: 'refunded',
  cancelled: 'unpaid',
};

export type BookingPaymentStatus = 'unpaid' | 'deposit' | 'paid' | 'refunded';

export function resolveEffectivePayment(record: {
  payment_status?: string | null;
  status?: string | null;
}): BookingPaymentStatus {
  const statusKey = String(record.status || 'confirmed').toLowerCase();
  const legacy = LEGACY_PAYMENT_STATUS_MAP[statusKey] ?? 'unpaid';
  const ex = record.payment_status as unknown;
  if (ex === undefined || ex === null || String(ex).trim() === '') {
    return legacy;
  }
  const p = String(ex).trim().toLowerCase();
  if (p === 'unpaid' || p === 'deposit' || p === 'paid' || p === 'refunded') {
    return p;
  }
  return legacy;
}

/** Admin chỉ không xóa khi tour đang/kết thúc hoặc đã paid/refunded. */
export function canAdminDeleteBookingRecord(record: {
  payment_status?: string | null;
  status?: string | null;
  tour_stage?: string | null;
}): boolean {
  const stage = String(record.tour_stage ?? 'scheduled').trim().toLowerCase();
  if (stage === 'in_progress' || stage === 'completed') return false;
  const effective = resolveEffectivePayment(record);
  return effective !== 'paid' && effective !== 'refunded';
}
