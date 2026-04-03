/** Chuẩn hóa giá trị old/new trong logs booking sang tiếng Việt (dữ liệu DB thường là enum tiếng Anh). */

const LOG_LABEL_VI: Record<string, string> = {
  // Giai đoạn tour
  scheduled: 'Sắp khởi hành',
  in_progress: 'Đang diễn ra',
  completed: 'Đã kết thúc',

  // Trạng thái đơn
  pending: 'Chờ duyệt',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',

  // Thanh toán
  unpaid: 'Chưa thanh toán',
  deposit: 'Đã đặt cọc',
  paid: 'Đã thanh toán đủ',
  refunded: 'Đã hoàn tiền',

  // Legacy / khác (nếu còn trong DB cũ)
  later: 'Thanh toán sau',
  offline: 'Thanh toán tại văn phòng',
};

export function formatBookingLogValue(raw: string | undefined | null): string {
  if (raw == null || String(raw).trim() === '') return '—';
  const key = String(raw).trim();
  return LOG_LABEL_VI[key] ?? key;
}
