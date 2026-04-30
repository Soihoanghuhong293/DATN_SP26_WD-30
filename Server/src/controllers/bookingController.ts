import { Request, Response } from 'express';
import Booking from '../models/Booking'; 
import Tour from '../models/Tour';
import ProviderTicket from '../models/ProviderTicket';
import VehicleAllocation from '../models/VehicleAllocation';
import RoomAllocation from '../models/RoomAllocation';
import Passenger from '../models/Passenger';
import User from '../models/user.model';
import { AuthRequest } from '../middlewares/auth.middleware';
import { canSendMail } from '../services/mailer';
import { sendGuideAssignmentEmail } from '../services/guideAssignmentEmail';
import { sendGuideUnassignmentEmail } from '../services/guideUnassignmentEmail';

const LEGACY_PAYMENT_STATUS_MAP: Record<string, 'unpaid' | 'deposit' | 'paid' | 'refunded'> = {
  pending: 'unpaid',
  confirmed: 'unpaid',
  deposit: 'deposit',
  paid: 'paid',
  refunded: 'refunded',
  cancelled: 'unpaid',
};

const normalizeId = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

const normalizeTripDate = (value: any) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  return raw;
};

const tripKeyOf = (tourId: string, dateStr: string) => `${tourId}:${dateStr}`;

const syncPassengersForBooking = async (booking: any) => {
  const bookingId = String(booking?._id || '');
  const tourId = String(booking?.tour_id?._id || booking?.tour_id || '');
  const startDateStr = booking?.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '';
  const dateStr = normalizeTripDate(startDateStr);
  if (!bookingId || !tourId || !dateStr) return;
  const tripKey = tripKeyOf(tourId, dateStr);

  await Passenger.deleteMany({ booking_id: bookingId });

  const docs: any[] = [];
  docs.push({
    booking_id: bookingId,
    tour_id: tourId,
    trip_key: tripKey,
    trip_date: dateStr,
    role: 'leader',
    full_name: booking?.customer_name || 'Trưởng đoàn',
    phone: booking?.customer_phone,
    type: 'leader',
  });

  const list = booking?.passengers || booking?.guests || booking?.guest_list || [];
  if (Array.isArray(list)) {
    list.forEach((g: any, idx: number) => {
      const subId = g?._id ? String(g._id) : `p${idx}`;
      docs.push({
        booking_id: bookingId,
        tour_id: tourId,
        trip_key: tripKey,
        trip_date: dateStr,
        role: 'passenger',
        source_guest_id: subId,
        full_name: g?.name || g?.full_name || `Khách ${idx + 1}`,
        gender: g?.gender,
        birth_date: g?.birthDate ? new Date(g.birthDate) : undefined,
        phone: g?.phone || g?.phoneNumber,
        type: g?.type,
      });
    });
  }

  if (docs.length > 0) await Passenger.insertMany(docs);
};
// chọn hdv chính và phụ
async function guideHasAccessToBooking(guideObjectId: any, booking: any): Promise<boolean> {
  const gid = String(guideObjectId?._id ?? guideObjectId);
  const direct = booking.guide_id?._id?.toString?.() ?? booking.guide_id?.toString?.();
  if (direct && direct === gid) return true;
  const tid = booking.tour_id?._id ?? booking.tour_id;
  if (!tid) return false;
  let t: any = null;
  if (
    booking.tour_id &&
    typeof booking.tour_id === 'object' &&
    (booking.tour_id as any).primary_guide_id !== undefined
  ) {
    t = booking.tour_id;
  } else {
    t = await Tour.findById(tid).select('primary_guide_id secondary_guide_ids').lean();
  }
  if (!t) return false;
  const p = String((t as any).primary_guide_id ?? '');
  if (p && p === gid) return true;
  const secs = Array.isArray((t as any).secondary_guide_ids) ? (t as any).secondary_guide_ids : [];
  return secs.some((s: any) => String(s) === gid);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const markAssignmentEmailSent = async (args: {
  bookingId: string;
  actorName: string;
  toEmail: string;
  guideId: string;
}) => {
  const now = new Date();
  await Booking.findByIdAndUpdate(
    args.bookingId,
    {
      $set: {
        assignment_email_last_sent_at: now,
        assignment_email_last_sent_to: args.toEmail,
        assignment_email_last_sent_guide_id: args.guideId,
      },
      $push: {
        logs: {
          time: now,
          user: args.actorName,
          old: 'Phân công HDV',
          new: 'Đã gửi email',
          note: `Đã gửi email phân công tới ${args.toEmail}`,
        },
      },
    },
    { new: false }
  );
};

// Lấy danh sách booking của HDV đang đăng nhập 
export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const tourIdsForGuide = await Tour.find({
      $or: [{ primary_guide_id: guideId }, { secondary_guide_ids: guideId }],
    })
      .select('_id')
      .lean();

    const tourIdList = tourIdsForGuide.map((x: any) => x._id).filter(Boolean);

    const bookings = await Booking.find({
      $or: [{ guide_id: guideId }, ...(tourIdList.length ? [{ tour_id: { $in: tourIdList } }] : [])],
    })
      .populate({ path: 'tour_id', select: 'name images duration_days price primary_guide_id secondary_guide_ids' })
      .populate({ path: 'user_id', select: 'name email phone' })
      .sort({ startDate: 1 });

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: bookings
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// HDV: lấy chi tiết 1 booking
export const getMyBookingDetail = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'tour_id', select: 'name schedule duration_days images primary_guide_id secondary_guide_ids' })
      .populate({ path: 'user_id', select: 'name email phone' });

    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    if (!(await guideHasAccessToBooking(guideId, booking))) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền xem đơn này' });
    }

    // format lại thời gian cho log
    const formattedBooking: any = booking.toObject();
    if (!formattedBooking.tour_stage) formattedBooking.tour_stage = 'scheduled';
    if (formattedBooking.logs) {
       formattedBooking.logs = formattedBooking.logs.map((log: any) => ({
         ...log,
         time: log.time ? new Date(log.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''
       })).reverse();
    }

    res.status(200).json({ status: 'success', data: formattedBooking });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/** Khách đăng nhập: danh sách booking */
export const getMyBookingsForUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }
    const role = String((req.user as any)?.role || 'user');
    if (role !== 'user') {
      return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới xem được mục này' });
    }

    const emailRaw = String((req.user as any)?.email || '').trim();
    const statusParam = typeof req.query.status === 'string' ? req.query.status : '';

    if (emailRaw) {
      const emailRegex = new RegExp(`^${escapeRegex(emailRaw)}$`, 'i');
      await Booking.updateMany(
        {
          $or: [{ user_id: null }, { user_id: { $exists: false } }],
          customer_email: emailRegex,
        },
        { $set: { user_id: userId } }
      );
    }

    const query: Record<string, unknown> = { user_id: userId };
    if (statusParam && ['pending', 'confirmed', 'cancelled'].includes(statusParam)) {
      query.status = statusParam;
    }

    const bookings = await Booking.find(query)
      .populate({ path: 'tour_id', select: 'name images duration_days price slug' })
      .sort({ created_at: -1 });

    res.status(200).json({ status: 'success', results: bookings.length, data: bookings });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/** Khách đăng nhập: chi tiết một booking */
export const getMyBookingDetailForUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }
    const role = String((req.user as any)?.role || 'user');
    if (role !== 'user') {
      return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới xem được mục này' });
    }

    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const booking: any = await Booking.findById(bookingId)
      .populate({ path: 'tour_id', select: 'name images duration_days price schedule slug' })
      .populate({ path: 'user_id', select: 'name email phone' })
      .populate({ path: 'guide_id', select: 'name email phone avatar' });

    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const uid = booking.user_id?._id?.toString?.() ?? booking.user_id?.toString?.();
    const emailRaw = String((req.user as any)?.email || '').trim();
    const emailRegex = emailRaw ? new RegExp(`^${escapeRegex(emailRaw)}$`, 'i') : null;
    const bookingEmail = String(booking.customer_email || '').trim();

    const ownsByUser = uid && uid === userId.toString();
    const ownsByEmail = Boolean(emailRegex && bookingEmail && emailRegex.test(bookingEmail));
    if (!ownsByUser && !ownsByEmail) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền xem đơn này' });
    }

    if (!ownsByUser && ownsByEmail) {
      booking.user_id = userId;
      await booking.save();
    }

    const formattedBooking: any = booking.toObject();
    if (formattedBooking.logs) {
      formattedBooking.logs = formattedBooking.logs.map((log: any) => ({
        ...log,
        time: log.time ? new Date(log.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '',
      })).reverse();
    }

    res.status(200).json({ status: 'success', data: formattedBooking });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/** Khách hàng: tạo yêu cầu hủy (không tự động hủy ngay) */
export const requestCancelForUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }
    const role = String((req.user as any)?.role || 'user');
    if (role !== 'user') {
      return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới tạo yêu cầu hủy' });
    }

    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const booking: any = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const uid = booking.user_id?._id?.toString?.() ?? booking.user_id?.toString?.();
    const emailRaw = String((req.user as any)?.email || '').trim();
    const emailRegex = emailRaw ? new RegExp(`^${escapeRegex(emailRaw)}$`, 'i') : null;
    const bookingEmail = String(booking.customer_email || '').trim();

    const ownsByUser = uid && uid === userId.toString();
    const ownsByEmail = Boolean(emailRegex && bookingEmail && emailRegex.test(bookingEmail));
    if (!ownsByUser && !ownsByEmail) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền thực hiện' });
    }

    if (String(booking.status || '') === 'cancelled') {
      return res.status(400).json({ status: 'fail', message: 'Đơn này đã bị hủy' });
    }

    if (booking.cancel_request && booking.cancel_request?.status === 'pending') {
      return res.status(400).json({ status: 'fail', message: 'Yêu cầu hủy đang chờ xử lý' });
    }

    // Không cho hủy khi tour đã diễn ra/đã hoàn thành/đã qua ngày khởi hành
    const tourStage = String(booking.tour_stage || 'scheduled');
    if (tourStage === 'in_progress') {
      return res.status(400).json({ status: 'fail', message: 'Tour đang diễn ra, không thể hủy' });
    }
    if (tourStage === 'completed') {
      return res.status(400).json({ status: 'fail', message: 'Tour đã hoàn thành, không thể hủy' });
    }
    const startDateCheck = booking.startDate ? new Date(booking.startDate) : null;
    if (startDateCheck && Date.now() >= startDateCheck.getTime()) {
      return res.status(400).json({ status: 'fail', message: 'Đã đến/ngày khởi hành, không thể hủy' });
    }

    const paymentStatus = String(booking.payment_status || LEGACY_PAYMENT_STATUS_MAP[booking.status] || 'unpaid');
    const total = Number(booking.total_price || 0);
    const depositAmount = Number(booking.deposit_amount || Math.round(total * 0.3));

    // ===== Logic hoàn tiền theo thời gian trước ngày đi =====
    // > 7 ngày: 100%
    // 3 - 7 ngày: 50%
    // < 3 ngày: 0%
    const startDate = booking.startDate ? new Date(booking.startDate) : null;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysBeforeStart = startDate ? Math.floor((startDate.getTime() - now.getTime()) / msPerDay) : 0;

    let timeRefundPercent = 0;
    if (daysBeforeStart > 7) timeRefundPercent = 100;
    else if (daysBeforeStart >= 3) timeRefundPercent = 50;
    else timeRefundPercent = 0;

    // Số tiền đã thanh toán thực tế để hoàn
    // unpaid: 0, deposit: deposit_amount, paid: total
    const paidAmount =
      paymentStatus === 'paid'
        ? total
        : paymentStatus === 'deposit'
          ? Math.max(0, depositAmount)
          : 0;

    const refundPercent = timeRefundPercent;
    const refundAmount = Math.max(0, Math.round((paidAmount * refundPercent) / 100));

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!reason) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng nhập lý do hủy' });
    }
    const bankName = typeof req.body?.bank_name === 'string' ? req.body.bank_name.trim().slice(0, 120) : '';
    const bankAccountNumber =
      typeof req.body?.bank_account_number === 'string' ? req.body.bank_account_number.trim().slice(0, 50) : '';
    const bankAccountName =
      typeof req.body?.bank_account_name === 'string' ? req.body.bank_account_name.trim().slice(0, 120) : '';
    const qrImageDataUrl =
      typeof req.body?.qr_image_data_url === 'string' ? req.body.qr_image_data_url.trim().slice(0, 2_000_000) : '';

    const allowedBanks = new Set(['Vietcombank', 'Techcombank', 'BIDV', 'Agribank', 'ACB', 'MB Bank']);
    if (!bankName) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng chọn ngân hàng' });
    }
    if (!allowedBanks.has(bankName)) {
      return res.status(400).json({ status: 'fail', message: 'Ngân hàng không hợp lệ' });
    }
    if (!bankAccountNumber) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng nhập số tài khoản' });
    }
    if (!bankAccountName) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng nhập chủ tài khoản' });
    }
    if (!qrImageDataUrl) {
      return res.status(400).json({ status: 'fail', message: 'Vui lòng upload QR ngân hàng' });
    }

    booking.set('cancel_request', {
      status: 'pending',
      payment_status: paymentStatus,
      refund_percent: refundPercent,
      refund_amount: refundAmount,
      days_before_start: daysBeforeStart,
      reason,
      bank: {
        name: bankName,
        account_number: bankAccountNumber,
        account_name: bankAccountName,
      },
      qr_image_data_url: qrImageDataUrl,
      created_at: new Date(),
    });
    booking.markModified('cancel_request');
    if (!Array.isArray(booking.logs)) booking.logs = [];
    booking.logs.push({
      time: new Date(),
      user: (req.user as any)?.name || 'Khách hàng',
      old: 'Yêu cầu hủy',
      new: 'pending',
      note: `Khách tạo yêu cầu hủy. Hoàn: ${refundAmount.toLocaleString('vi-VN')}đ (${refundPercent}%)${reason ? `; Lý do: ${reason}` : ''}`,
    });

    await booking.save();
    return res.status(200).json({
      status: 'success',
      data: {
        booking_id: bookingId,
        cancel_request: booking.cancel_request,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi tạo yêu cầu hủy' });
  }
};

// ===== ADMIN: xử lý yêu cầu hủy tour =====
const normalizeCancelRequestStatus = (v: any) => {
  const s = String(v || '').trim();
  if (s === 'approved' || s === 'rejected' || s === 'refunded') return s;
  return 'pending';
};

const computePaidAmountForRefund = (booking: any) => {
  const paymentStatus = String(booking.payment_status || LEGACY_PAYMENT_STATUS_MAP[booking.status] || 'unpaid');
  const total = Number(booking.total_price || 0);
  const depositAmount = Number(booking.deposit_amount || Math.round(total * 0.3));
  if (paymentStatus === 'paid') return { paymentStatus, total, paidAmount: total };
  if (paymentStatus === 'deposit') return { paymentStatus, total, paidAmount: Math.max(0, depositAmount) };
  return { paymentStatus, total, paidAmount: 0 };
};

export const getCancelRequestsForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const statusParam = typeof req.query.status === 'string' ? req.query.status : '';
    const status = statusParam ? normalizeCancelRequestStatus(statusParam) : '';

    const query: any = { cancel_request: { $exists: true } };
    if (status) query['cancel_request.status'] = status;

    const rows = await Booking.find(query)
      .populate({ path: 'tour_id', select: 'name images duration_days price slug' })
      .populate({ path: 'user_id', select: 'name email phone' })
      .sort({ 'cancel_request.created_at': -1 })
      .lean();

    const data = rows.map((b: any) => {
      const { paymentStatus, total, paidAmount } = computePaidAmountForRefund(b);
      return {
        ...b,
        _computed: { payment_status: paymentStatus, total, paid_amount: paidAmount },
      };
    });

    return res.status(200).json({ status: 'success', results: data.length, data });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCancelRequestDetailForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const booking: any = await Booking.findById(bookingId)
      .populate({ path: 'tour_id', select: 'name images duration_days price schedule slug' })
      .populate({ path: 'user_id', select: 'name email phone' })
      .populate({ path: 'guide_id', select: 'name email phone avatar' })
      .lean();

    if (!booking) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    if (!booking.cancel_request) return res.status(404).json({ status: 'fail', message: 'Đơn này không có yêu cầu hủy' });

    const { paymentStatus, total, paidAmount } = computePaidAmountForRefund(booking);
    return res.status(200).json({
      status: 'success',
      data: {
        ...booking,
        _computed: { payment_status: paymentStatus, total, paid_amount: paidAmount },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const approveCancelRequestForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const actor = req.user?.name || 'Admin';
    const booking: any = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    if (!booking.cancel_request) return res.status(400).json({ status: 'fail', message: 'Đơn này không có yêu cầu hủy' });

    const current = String(booking.cancel_request?.status || 'pending');
    if (current !== 'pending') {
      return res.status(400).json({ status: 'fail', message: 'Yêu cầu hủy không ở trạng thái chờ xử lý' });
    }

    booking.cancel_request.status = 'approved';
    booking.cancel_request.approved_at = new Date();
    booking.cancel_request.approved_by = actor;
    booking.markModified('cancel_request');

    if (!Array.isArray(booking.logs)) booking.logs = [];
    booking.logs.push({
      time: new Date(),
      user: actor,
      old: 'Yêu cầu hủy',
      new: 'approved',
      note: 'Admin duyệt yêu cầu hủy. Vui lòng thực hiện hoàn tiền thủ công.',
    });

    await booking.save();
    return res.status(200).json({ status: 'success', data: { booking_id: bookingId, cancel_request: booking.cancel_request } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const rejectCancelRequestForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const actor = req.user?.name || 'Admin';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!reason) return res.status(400).json({ status: 'fail', message: 'Vui lòng nhập lý do từ chối' });

    const booking: any = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    if (!booking.cancel_request) return res.status(400).json({ status: 'fail', message: 'Đơn này không có yêu cầu hủy' });

    const current = String(booking.cancel_request?.status || 'pending');
    if (current !== 'pending') {
      return res.status(400).json({ status: 'fail', message: 'Yêu cầu hủy không ở trạng thái chờ xử lý' });
    }

    booking.cancel_request.status = 'rejected';
    booking.cancel_request.rejected_at = new Date();
    booking.cancel_request.rejected_by = actor;
    booking.cancel_request.reject_reason = reason;
    booking.markModified('cancel_request');

    if (!Array.isArray(booking.logs)) booking.logs = [];
    booking.logs.push({
      time: new Date(),
      user: actor,
      old: 'Yêu cầu hủy',
      new: 'rejected',
      note: `Admin từ chối yêu cầu hủy. Lý do: ${reason}`,
    });

    await booking.save();
    return res.status(200).json({ status: 'success', data: { booking_id: bookingId, cancel_request: booking.cancel_request } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const markCancelRequestRefundedForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const actor = req.user?.name || 'Admin';

    const booking: any = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    if (!booking.cancel_request) return res.status(400).json({ status: 'fail', message: 'Đơn này không có yêu cầu hủy' });

    const current = String(booking.cancel_request?.status || 'pending');
    if (current !== 'approved') {
      return res.status(400).json({ status: 'fail', message: 'Chỉ có thể xác nhận hoàn tiền sau khi đã duyệt' });
    }

    // cập nhật hoàn tất
    booking.cancel_request.status = 'refunded';
    booking.cancel_request.refunded_at = new Date();
    booking.cancel_request.refunded_by = actor;
    booking.markModified('cancel_request');

    // cập nhật trạng thái booking
    booking.status = 'cancelled';
    booking.payment_status = 'refunded';

    if (!Array.isArray(booking.logs)) booking.logs = [];
    booking.logs.push({
      time: new Date(),
      user: actor,
      old: 'Hoàn tiền',
      new: 'done',
      note: 'Admin xác nhận đã hoàn tiền. Booking chuyển sang đã hủy.',
    });

    await booking.save();
    return res.status(200).json({
      status: 'success',
      data: { booking_id: bookingId, status: booking.status, payment_status: booking.payment_status, cancel_request: booking.cancel_request },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// HDV: Check-in khách (trưởng đoàn hoặc passenger)
export const checkInPassenger = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const b = booking as any;
    if (!(await guideHasAccessToBooking(guideId, b))) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền thực hiện' });
    }

    // Chỉ cho phép điểm danh khi tour đang diễn ra
    const stage = b.tour_stage || 'scheduled';
    if (stage !== 'in_progress') {
      return res.status(400).json({
        status: 'fail',
        message:
          stage === 'completed'
            ? 'Tour đã kết thúc, không thể điểm danh.'
            : 'Tour chưa bắt đầu, không thể điểm danh.',
      });
    }

    const { type, passengerIndex, day, checkpointIndex, checked, reason } = req.body;

    const hasCheckpoint =
      (typeof day === 'number' || (typeof day === 'string' && String(day).trim() !== '')) &&
      (typeof checkpointIndex === 'number' || (typeof checkpointIndex === 'string' && String(checkpointIndex).trim() !== ''));

    // ===== New: check-in theo từng checkpoint (ngày + chặng) =====
    if (hasCheckpoint) {
      const dayKey = String(day);
      const cpKey = String(checkpointIndex);

      const totalPassengers = Array.isArray(b.passengers) ? b.passengers.length : 0;
      const current = (b.checkpoint_checkins || {}) as any;
      const dayObj = current[dayKey] || {};
      const cpObj =
        dayObj[cpKey] ||
        ({
          leader: undefined,
          passengers: Array(totalPassengers).fill(undefined),
          reasons: { leader: "", passengers: Array(totalPassengers).fill("") },
        } as any);

      // đồng bộ độ dài passengers nếu có thay đổi
      const normalizedPassengers = Array.isArray(cpObj.passengers) ? cpObj.passengers.slice(0, totalPassengers) : [];
      while (normalizedPassengers.length < totalPassengers) normalizedPassengers.push(undefined);
      cpObj.passengers = normalizedPassengers;

      // normalize reasons
      if (!cpObj.reasons) cpObj.reasons = { leader: "", passengers: Array(totalPassengers).fill("") };
      if (!cpObj.reasons.passengers) cpObj.reasons.passengers = [];
      const normalizedReasons = Array.isArray(cpObj.reasons.passengers) ? cpObj.reasons.passengers.slice(0, totalPassengers) : [];
      while (normalizedReasons.length < totalPassengers) normalizedReasons.push("");
      cpObj.reasons.passengers = normalizedReasons;

      const mustReason = (val: any) => typeof val === "string" && val.trim().length > 0;

      if (type === 'leader') {
        const nextChecked = typeof checked === "boolean" ? checked : !Boolean(cpObj.leader);
        if (nextChecked === false && !mustReason(reason)) {
          return res.status(400).json({ status: "fail", message: "Lý do vắng mặt là bắt buộc." });
        }
        cpObj.leader = nextChecked;
        cpObj.reasons.leader = nextChecked ? "" : String(reason || "").trim();
      } else if (type === 'passenger' && typeof passengerIndex === 'number') {
        if (passengerIndex < 0 || passengerIndex >= totalPassengers) {
          return res.status(400).json({ status: 'fail', message: 'Chỉ mục khách không hợp lệ' });
        }
        const nextChecked = typeof checked === "boolean" ? checked : !Boolean(normalizedPassengers[passengerIndex]);
        if (nextChecked === false && !mustReason(reason)) {
          return res.status(400).json({ status: "fail", message: "Lý do vắng mặt là bắt buộc." });
        }
        normalizedPassengers[passengerIndex] = nextChecked;
        cpObj.passengers = normalizedPassengers;
        cpObj.reasons.passengers[passengerIndex] = nextChecked ? "" : String(reason || "").trim();
      } else {
        return res.status(400).json({ status: 'fail', message: 'Thiếu type hoặc passengerIndex' });
      }

      const next = {
        ...current,
        [dayKey]: {
          ...dayObj,
          [cpKey]: {
            leader: cpObj.leader,
            passengers: cpObj.passengers || normalizedPassengers,
            reasons: cpObj.reasons,
          },
        },
      };

      const updated = await Booking.findByIdAndUpdate(
        req.params.id,
        { checkpoint_checkins: next },
        { new: true }
      );

      return res.status(200).json({ status: 'success', data: updated });
    }

    // ===== Legacy: check-in 1 lần chung toàn tour =====
    let updated;
    if (type === 'leader') {
      updated = await Booking.findByIdAndUpdate(
        req.params.id,
        { leaderCheckedIn: !b.leaderCheckedIn },
        { new: true }
      );
    } else if (type === 'passenger' && typeof passengerIndex === 'number') {
      const passengers = (b.passengers || []).map((p: any, i: number) => {
        const obj = p.toObject ? p.toObject() : p;
        if (i === passengerIndex) {
          return { ...obj, checkedIn: !obj.checkedIn };
        }
        return obj;
      });
      if (passengers[passengerIndex]) {
        updated = await Booking.findByIdAndUpdate(
          req.params.id,
          { passengers },
          { new: true }
        );
      } else {
        return res.status(400).json({ status: 'fail', message: 'Chỉ mục khách không hợp lệ' });
      }
    } else {
      return res.status(400).json({ status: 'fail', message: 'Thiếu type hoặc passengerIndex' });
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// HDV: Cập nhật giai đoạn tour
export const updateTourStage = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const b = booking as any;
    if (!(await guideHasAccessToBooking(guideId, b))) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền thực hiện' });
    }

    const { tour_stage } = req.body;
    const validStages = ['scheduled', 'in_progress', 'completed'];
    if (!tour_stage || !validStages.includes(tour_stage)) {
      return res.status(400).json({ status: 'fail', message: 'tour_stage không hợp lệ' });
    }

    // Chỉ cho phép chuyển trạng thái tiến tới (không được quay ngược)
    const currentStage = b.tour_stage || 'scheduled';
    const stageOrder: Record<string, number> = { scheduled: 0, in_progress: 1, completed: 2 };
    const from = stageOrder[currentStage] ?? 0;
    const to = stageOrder[tour_stage] ?? 0;
    if (to < from) {
      return res.status(400).json({
        status: 'fail',
        message: 'Không thể chuyển trạng thái ngược lại.',
      });
    }
    if (to === from) {
      return res.status(200).json({ status: 'success', data: b });
    }
    if (to !== from + 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'Chỉ được chuyển sang trạng thái tiếp theo.',
      });
    }

    // Nếu kết thúc tour: bắt buộc điểm danh đủ tất cả ngày + lịch trình (checkpoint)
    if (tour_stage === 'completed') {
      const tour = await Tour.findById(b.tour_id).select('schedule');
      const schedule = Array.isArray((tour as any)?.schedule) ? (tour as any).schedule : [];
      const checkpointDays = schedule
        .map((d: any, idx: number) => ({
          day: Number(d?.day ?? idx + 1),
          checkpoints: Array.isArray(d?.activities)
            ? d.activities.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
            : [],
        }))
        .sort((a: any, b2: any) => a.day - b2.day);

      // Nếu không có checkpoint thì không cần ràng buộc điểm danh
      const hasAnyCheckpoint = checkpointDays.some((d: any) => Array.isArray(d.checkpoints) && d.checkpoints.length > 0);
      if (hasAnyCheckpoint) {
        const checkins = (b.checkpoint_checkins || {}) as any;
        const totalPassengers = Array.isArray(b.passengers) ? b.passengers.length : 0;

        const hasReason = (v: any) => typeof v === 'string' && v.trim().length > 0;

        for (const d of checkpointDays) {
          for (let cpIdx = 0; cpIdx < (d.checkpoints || []).length; cpIdx += 1) {
            const cp = checkins?.[String(d.day)]?.[String(cpIdx)];
            if (!cp) {
              return res.status(400).json({
                status: 'fail',
                message: `Chưa điểm danh đủ. Thiếu dữ liệu điểm danh ở Ngày ${d.day}, lịch trình ${cpIdx + 1}.`,
              });
            }

            if (cp.leader === undefined) {
              return res.status(400).json({
                status: 'fail',
                message: `Chưa điểm danh trưởng đoàn ở Ngày ${d.day}, lịch trình ${cpIdx + 1}.`,
              });
            }
            const leaderOk = cp.leader === true || (cp.leader === false && hasReason(cp?.reasons?.leader));
            if (!leaderOk) {
              return res.status(400).json({
                status: 'fail', 
                message: `Trưởng đoàn vắng mặt nhưng chưa có lý do ở Ngày ${d.day}, lịch trình ${cpIdx + 1}.`,
              });
            }

            for (let pIdx = 0; pIdx < totalPassengers; pIdx += 1) {
              const st = cp?.passengers?.[pIdx];
              if (st === undefined) {
                return res.status(400).json({
                  status: 'fail',
                  message: `Chưa điểm danh đủ. Thiếu điểm danh khách #${pIdx + 1} ở Ngày ${d.day}, lịch trình ${cpIdx + 1}.`,
                });
              }
              const ok = st === true || (st === false && hasReason(cp?.reasons?.passengers?.[pIdx]));
              if (!ok) {
                return res.status(400).json({
                  status: 'fail',
                  message: `Khách #${pIdx + 1} vắng mặt nhưng chưa có lý do ở Ngày ${d.day}, lịch trình ${cpIdx + 1}.`,
                });
              }
            }
          }
        }
      }
    }

    // Ghi log tự động khi HDV đổi giai đoạn tour
    b.logs.push({
      time: new Date(),
      user: req.user?.name || 'Hướng dẫn viên',
      old: b.tour_stage || 'scheduled',
      new: tour_stage,
      note: 'HDV cập nhật tiến độ tour'
    });
    b.tour_stage = tour_stage;

    await b.save();

    res.status(200).json({ status: 'success', data: b });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// HDV: Thêm 1 nhật kí theo ngày cho tour
export const addDiaryEntryForGuide = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const b = booking as any;
    if (!(await guideHasAccessToBooking(guideId, b))) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền thực hiện' });
    }

    const {
      date,
      day_no,
      title,
      content,
      highlight,
      images
    } = req.body || {};
    if (!date) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu date' });
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ status: 'fail', message: 'date không hợp lệ' });
    }

    const safeDayNo = typeof day_no === 'number' && day_no > 0 ? day_no : 1;
    const safeImages = Array.isArray(images)
      ? images
          .filter((img: any) => img && typeof img.url === 'string' && img.url.length > 0)
          .slice(0, 8)
      : [];

    if (!Array.isArray(b.diary_entries)) b.diary_entries = [];

    // 1 ngày chỉ có 1 nhật kí: cập nhật theo day_no, xoá các bản trùng (dữ liệu cũ)
    const existing = b.diary_entries.find((e: any) => Number(e?.day_no || 1) === Number(safeDayNo));
    b.diary_entries = b.diary_entries.filter((e: any) => Number(e?.day_no || 1) !== Number(safeDayNo));

    b.diary_entries.push({
      ...(existing?._id ? { _id: existing._id } : {}),
      date: d,
      day_no: safeDayNo,
      title: title || '',
      content: content || '',
      highlight: highlight || '',
      images: safeImages,
      created_by: existing?.created_by || (req.user?.name || 'Hướng dẫn viên'),
      created_at: existing?.created_at || new Date(),
      updated_at: new Date()
    });

    await b.save();
    return res.status(200).json({ status: 'success', data: b });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// HDV: Xoá nhật kí theo ngày (day_no)
export const deleteDiaryEntryForGuide = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const b = booking as any;
    if (!(await guideHasAccessToBooking(guideId, b))) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền thực hiện' });
    }

    const dayNo = Number(req.params.dayNo);
    if (!dayNo || Number.isNaN(dayNo) || dayNo < 1) {
      return res.status(400).json({ status: 'fail', message: 'dayNo không hợp lệ' });
    }

    const before = Array.isArray(b.diary_entries) ? b.diary_entries.length : 0;
    b.diary_entries = Array.isArray(b.diary_entries)
      ? b.diary_entries.filter((e: any) => Number(e?.day_no || 1) !== dayNo)
      : [];

    const after = b.diary_entries.length;
    if (before === after) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy nhật kí của ngày này' });
    }

    await b.save();
    return res.status(200).json({ status: 'success', data: b });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

//admiin

// lấy tất cả đơn đặt tour
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find()
      .populate({ path: 'tour_id', select: 'name images duration_days price' })
      .populate({ path: 'user_id', select: 'name email phone' })
      .populate({ path: 'guide_id', select: 'name email phone' })
      .sort({ created_at: -1 });

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: bookings
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// lấy chi tiết 1 đơn hàng
export const getBooking = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(
        'tour_id',
        'name duration_days images schedule suppliers description policies price slug status departure_schedule',
      )
      .populate('guide_id', 'name phone email')  
      .populate('user_id', 'name phone email');  
      
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Format lại thời gian cho mảng logs
    const formattedBooking: any = booking.toObject();
    if (formattedBooking.logs) {
       formattedBooking.logs = formattedBooking.logs.map((log: any) => ({
         ...log,
         time: log.time ? new Date(log.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''
       })).reverse(); // Đảo ngược để log mới nhất lên đầu
    }

    res.status(200).json({
      status: 'success',
      data: formattedBooking
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// tạo đơn đặt tour mới
export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const {
      tour_id,
      startDate,
      customer_name,
      customerName,
      customer_phone,
      phone,
      customer_email,
      email,
      customer_address,
      address,
      customer_note,
      note,
      total_price,
      totalPrice,
      groupSize,
      paymentMethod,
      guide_id,
    } = req.body;

    const normalizedCustomerName = customer_name || customerName;
    const normalizedCustomerPhone = customer_phone || phone;
    const normalizedCustomerEmail = customer_email || email;
    const normalizedCustomerAddress = customer_address || address;
    const normalizedCustomerNote = customer_note || note;
    const normalizedTotalPrice = total_price ?? totalPrice;

    if (!tour_id || !startDate) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tour hoặc ngày khởi hành' });
    }

    if (!normalizedCustomerName || !normalizedCustomerPhone || !groupSize) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu thông tin khách hàng' });
    }

    const tour = await Tour.findById(tour_id).populate({
      path: 'schedule.ticket_ids',
      select: 'application_mode status price_adult price_child name',
    });
    if (!tour) {
      return res.status(404).json({ status: 'fail', message: 'Tour không tồn tại' });
    }

    if ((tour as any).status !== 'active') {
      return res.status(400).json({
        status: 'fail',
        message: 'Tour không mở bán hoặc đang tạm dừng. Chỉ tour đang hoạt động mới được đặt.',
      });
    }

    // Validate số chỗ còn lại cho ngày khởi hành
    const departureSchedule = (tour as any).departure_schedule || [];
    const startDateStr = new Date(startDate).toISOString().split('T')[0]; // YYYY-MM-DD

    const scheduleForDate = Array.isArray(departureSchedule)
      ? departureSchedule.find((s: any) => {
          if (!s?.date) return false;
          const normalized =
            typeof s.date === 'string'
              ? (s.date.includes('T') ? s.date.split('T')[0] : s.date)
              : new Date(s.date).toISOString().split('T')[0];
          return normalized === startDateStr;
        })
      : null;

    if (!scheduleForDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'Ngày khởi hành không hợp lệ hoặc không có trong lịch trình của tour. Vui lòng chọn ngày khác.',
      });
    }

    const totalSlotsForDate = scheduleForDate.slots ?? 0;

    // Tính tổng groupSize của các booking không bị hủy cho cùng tour + ngày
    const existingBookings = await Booking.find({
      tour_id,
      startDate: {
        $gte: new Date(startDateStr + 'T00:00:00.000Z'),
        $lte: new Date(startDateStr + 'T23:59:59.999Z'),
      },
      status: { $ne: 'cancelled' },
    }).select('groupSize');

    const usedSlots = existingBookings.reduce((sum, b: any) => sum + (b.groupSize || 0), 0);
    const requested = Number(groupSize || 0);
    const remaining = totalSlotsForDate - usedSlots;

    if (requested > remaining) {
      return res.status(400).json({
        status: 'fail',
        message: `Số chỗ còn lại cho ngày khởi hành này chỉ còn ${Math.max(
          remaining,
          0
        )} chỗ. Vui lòng giảm số khách hoặc chọn ngày khác.`,
      });
    }

    const scheduleForTickets = Array.isArray((tour as any).schedule) ? (tour as any).schedule : [];
    const allowedOptionalTicketIds = new Set<string>();
    for (const day of scheduleForTickets) {
      const ticks = day?.ticket_ids || [];
      for (const t of ticks) {
        if (!t || typeof t !== 'object') continue;
        if ((t as any).status && (t as any).status !== 'active') continue;
        const tid = (t as any)._id?.toString?.();
        if (tid && (t as any).application_mode === 'optional_addon') {
          allowedOptionalTicketIds.add(tid);
        }
      }
    }

    const rawOptional = req.body.optional_ticket_ids ?? req.body.optionalTicketIds;
    const selectedOptionalIds: string[] = Array.isArray(rawOptional)
      ? [...new Set(rawOptional.map((x: any) => String(x)))]
      : [];

    for (const tid of selectedOptionalIds) {
      if (!allowedOptionalTicketIds.has(tid)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Có vé được chọn không áp dụng cho tour này hoặc không thuộc loại mua thêm.',
        });
      }
    }

    const passengersBody = req.body.passengers || req.body.guests || [];
    let adultsCount = 0;
    let childrenCount = 0;
    if (Array.isArray(passengersBody) && passengersBody.length > 0) {
      for (const p of passengersBody) {
        const typ = String((p as any)?.type || '');
        if (typ.includes('Trẻ em')) childrenCount += 1;
        else adultsCount += 1;
      }
    } else {
      adultsCount = Math.max(1, Number(groupSize) || 0);
    }

    let optionalTicketsAddon = 0;
    if (selectedOptionalIds.length > 0) {
      const ticketDocs = await ProviderTicket.find({
        _id: { $in: selectedOptionalIds },
        status: 'active',
        application_mode: 'optional_addon',
      });
      if (ticketDocs.length !== selectedOptionalIds.length) {
        return res.status(400).json({
          status: 'fail',
          message: 'Một hoặc nhiều vé không tồn tại hoặc không còn áp dụng.',
        });
      }
      for (const ticket of ticketDocs) {
        const id = ticket._id.toString();
        if (!allowedOptionalTicketIds.has(id)) {
          return res.status(400).json({
            status: 'fail',
            message: 'Vé được chọn không nằm trong lịch tour.',
          });
        }
        const pa = Number(ticket.price_adult || 0);
        const pc = Number(ticket.price_child || 0);
        optionalTicketsAddon += adultsCount * pa + childrenCount * pc;
      }
    }

    const tourOnlyTotal = Number(normalizedTotalPrice ?? 0);
    const finalTotalPrice = tourOnlyTotal + optionalTicketsAddon;

    const incomingStatus = req.body?.status;
    const normalizedPaymentStatus =
      req.body?.payment_status ||
      (typeof incomingStatus === 'string' ? LEGACY_PAYMENT_STATUS_MAP[incomingStatus] : undefined) ||
      'unpaid';

    const normalizedBookingStatus =
      incomingStatus === 'cancelled'
        ? 'cancelled'
        : incomingStatus === 'pending' || incomingStatus === 'confirmed'
          ? incomingStatus
          : 'confirmed';

    // Tính ngày kết thúc từ ngày khởi hành + duration_days của tour
    const durationDays = Number((tour as any)?.duration_days ?? 1);
    const start = new Date(startDateStr + 'T00:00:00.000Z');
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.max(0, durationDays - 1));

    const newBookingData: any = {
      ...req.body,
      customer_name: normalizedCustomerName,
      customer_phone: normalizedCustomerPhone,
      customer_email: normalizedCustomerEmail,
      customer_address: normalizedCustomerAddress,
      customer_note: normalizedCustomerNote,
      total_price: finalTotalPrice,
      optional_ticket_ids: selectedOptionalIds,
      optional_tickets_total: optionalTicketsAddon,
      paymentMethod: paymentMethod || req.body.payment_method || 'later',
      status: normalizedBookingStatus,
      payment_status: normalizedPaymentStatus,
      endDate: end,
    };
    // mặc định trạng thái giai đoạn tour là "sắp khởi hành"
    if (!newBookingData.tour_stage) {
      newBookingData.tour_stage = 'scheduled';
    }

    const authUser = req.user;
    if (authUser && String((authUser as any).role) === 'user') {
      newBookingData.user_id = (authUser as any)._id;
    }

    // tự động tạo lịch sử đầu tiên
    const initialStatus = newBookingData.status || 'confirmed';
    newBookingData.logs = [{
      time: new Date(),
      user: (req as any).user?.name || 'Hệ thống', 
      old: 'Khởi tạo',
      new: initialStatus,
      note: 'Hệ thống tự động duyệt đơn hàng mới'
    }];

    const gidBody = normalizeId(guide_id);
    const gidTour = normalizeId((tour as any).primary_guide_id);
    if (gidBody) {
      newBookingData.guide_id = gidBody;
    } else if (gidTour) {
      newBookingData.guide_id = gidTour;
    }

    const newBooking = await Booking.create(newBookingData);
    // Stage 1: sync passengers to separate collection for trip operation
    try {
      await syncPassengersForBooking(newBooking);
    } catch {
      // do not block booking creation
    }

    // Nếu admin tạo booking và đã phân công HDV ngay -> gửi email thông báo
    try {
      const assignedGuideId = normalizeId((newBooking as any)?.guide_id || guide_id);
      if (assignedGuideId) {
        const guideUser = await User.findById(assignedGuideId).select("name email role status");
        const toEmail = String((guideUser as any)?.email || "").trim();
        const isGuideRole = (guideUser as any)?.role === "guide" || (guideUser as any)?.role === "hdv";
        const isActive = (guideUser as any)?.status !== "inactive";

        const lastSentGuideId = normalizeId((newBooking as any)?.assignment_email_last_sent_guide_id);
        if (lastSentGuideId && lastSentGuideId === assignedGuideId) {
          // chống gửi trùng
        } else if (canSendMail() && toEmail && isGuideRole && isActive) {
          await sendGuideAssignmentEmail({
            toEmail,
            guideName: (guideUser as any)?.name,
            bookingId: String((newBooking as any)?._id),
            tourName: String((tour as any)?.name || "Tour"),
            startDate: (newBooking as any)?.startDate,
            endDate: (newBooking as any)?.endDate,
            customerName: (newBooking as any)?.customer_name,
            groupSize: Number((newBooking as any)?.groupSize || 0),
            bookingStatus: String((newBooking as any)?.status || ''),
            pickupLocation: String((newBooking as any)?.customer_address || ''),
            departureTime: String((newBooking as any)?.departure_time || (newBooking as any)?.start_time || ''),
            note: String((newBooking as any)?.customer_note || ''),
          });
          await markAssignmentEmailSent({
            bookingId: String((newBooking as any)?._id),
            actorName: (req as any).user?.name || 'Admin',
            toEmail,
            guideId: assignedGuideId,
          });
        }
      }
    } catch (e) {
      // Không chặn tạo booking nếu gửi email thất bại
    }

    res.status(201).json({
      status: 'success',
      data: newBooking
    });

  } catch (error: any) {
    res.status(400).json({
      status: 'fail',
      message: error.message || 'Lỗi khi tạo đơn hàng'
    });
  }
};

// quản lí danh sách khách
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const currentUser = (req as any).user?.name || 'Admin';

    //  kiểm tra booking có tồn tại không
    const booking: any = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const oldGuideId = normalizeId((booking as any)?.guide_id?.toString?.() || (booking as any)?.guide_id);
    const incomingGuideIdRaw = req.body?.guide_id;
    const incomingGuideId = normalizeId(incomingGuideIdRaw);
    const guideFieldTouched = Object.prototype.hasOwnProperty.call(req.body || {}, 'guide_id');
    const guideAssignedOrSwapped = Boolean(incomingGuideId) && incomingGuideId !== oldGuideId;
    const guideRemoved = guideFieldTouched && !!oldGuideId && !incomingGuideId;

    let mail: any = (guideAssignedOrSwapped || guideRemoved)
      ? { attempted: true, sent: false, reason: '', unassigned: { attempted: false, sent: false, reason: '' } }
      : { attempted: false, sent: false, reason: 'guide_id không thay đổi', unassigned: { attempted: false, sent: false, reason: '' } };

    //  chuẩn bị dữ liệu update
    const updateData: any = { ...req.body };
    const logsToAdd: any[] = [];

    // cập nhật danh sách hành khác
    const incomingPassengers = req.body.passengers || req.body.guests;
    if (incomingPassengers) {
      // Cảnh báo nếu số lượng lố groupSize
      if (incomingPassengers.length > booking.groupSize) {
        return res.status(400).json({
          status: 'fail',
          message: `Số lượng danh sách (${incomingPassengers.length}) vượt quá số khách đã đặt (${booking.groupSize})!`
        });
      }

      updateData.passengers = incomingPassengers; 
      delete updateData.guests; 

      // Thêm log lịch sử
      logsToAdd.push({
        time: new Date(),
        user: currentUser,
        old: 'Danh sách khách',
        new: 'Đã cập nhật',
        note: `Cập nhật danh sách: ${incomingPassengers.length} hành khách`
      });
    }

    // Nếu có đổi trạng thái đơn (booking status)
    if (req.body.status && ['pending', 'confirmed', 'cancelled'].includes(req.body.status) && req.body.status !== booking.status) {
      logsToAdd.push({
        time: new Date(),
        user: currentUser,
        old: booking.status,
        new: req.body.status,
        note: req.body.note || 'Thay đổi trạng thái đơn'
      });
    }

    const currentPaymentStatus = booking.payment_status || LEGACY_PAYMENT_STATUS_MAP[booking.status] || 'unpaid';
    const nextPaymentStatus =
      req.body.payment_status ||
      (req.body.status && ['deposit', 'paid', 'refunded'].includes(req.body.status) ? req.body.status : undefined);

    if (nextPaymentStatus && nextPaymentStatus !== currentPaymentStatus) {
      updateData.payment_status = nextPaymentStatus;
      if (['deposit', 'paid', 'refunded'].includes(updateData.status)) {
        delete updateData.status;
      }
      logsToAdd.push({
        time: new Date(),
        user: currentUser,
        old: currentPaymentStatus,
        new: nextPaymentStatus,
        note: req.body.note || 'Thay đổi trạng thái thanh toán',
      });
    }

    delete updateData.logs;

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: updateData,
        $push: { logs: { $each: logsToAdd } } 
      },
      { new: true, runValidators: true }
    );

    // Stage 1: sync passengers (Trip operation uses Passenger collection)
    if (updatedBooking && incomingPassengers) {
      try {
        await syncPassengersForBooking(updatedBooking);
      } catch {
        // do not block update
      }
    }

    // Nếu phân công/đổi HDV -> gửi email cho HDV mới
    if (guideAssignedOrSwapped && updatedBooking) {
      try {
        const lastSentGuideId = normalizeId((booking as any)?.assignment_email_last_sent_guide_id);
        if (lastSentGuideId && lastSentGuideId === incomingGuideId) {
          mail.sent = false;
          mail.reason = 'Đã gửi email phân công cho HDV này trước đó';
        } else {
        const guideUser = await User.findById(incomingGuideId).select('name email role status');
        const tour = await Tour.findById((updatedBooking as any).tour_id).select('name duration_days');
        const toEmail = String((guideUser as any)?.email || '').trim();

        const isGuideRole = (guideUser as any)?.role === 'guide' || (guideUser as any)?.role === 'hdv';
        const isActive = (guideUser as any)?.status !== 'inactive';

        if (!canSendMail()) {
          mail.reason = 'SMTP chưa cấu hình';
          console.warn('[mail] SMTP chưa cấu hình, bỏ qua gửi email phân công.');
        } else if (!toEmail) {
          mail.reason = 'HDV không có email';
          console.warn('[mail] HDV không có email, bỏ qua gửi email phân công.');
        } else if (!isGuideRole) {
          mail.reason = 'User không phải role guide/hdv';
          console.warn('[mail] User được phân công không phải role guide/hdv, bỏ qua gửi email.');
        } else if (!isActive) {
          mail.reason = 'Tài khoản HDV bị khóa';
          console.warn('[mail] Tài khoản HDV bị khóa, bỏ qua gửi email.');
        } else {
          await sendGuideAssignmentEmail({
            toEmail,
            guideName: (guideUser as any)?.name,
            bookingId: String((updatedBooking as any)?._id || bookingId),
            tourName: String((tour as any)?.name || (updatedBooking as any)?.tour_id?.name || 'Tour'),
            startDate: (updatedBooking as any)?.startDate,
            endDate: (updatedBooking as any)?.endDate,
            customerName: (updatedBooking as any)?.customer_name,
            groupSize: Number((updatedBooking as any)?.groupSize || 0),
            bookingStatus: String((updatedBooking as any)?.status || ''),
            pickupLocation: String((updatedBooking as any)?.customer_address || ''),
            departureTime: String((updatedBooking as any)?.departure_time || (updatedBooking as any)?.start_time || ''),
            note: String((updatedBooking as any)?.customer_note || ''),
          });
          mail.sent = true;
          mail.reason = '';
          console.log(`[mail] Đã gửi email phân công đến: ${toEmail}`);

          await markAssignmentEmailSent({
            bookingId,
            actorName: currentUser,
            toEmail,
            guideId: incomingGuideId,
          });
        }
        }
      } catch (e) {
        mail.reason = (e as any)?.message || 'Gửi email thất bại';
        console.error('[mail] Gửi email phân công thất bại:', e);
        // Không chặn cập nhật booking nếu gửi email thất bại
      }
    }

    // Nếu gỡ phân công hoặc đổi HDV -> gửi email cho HDV cũ (thông báo không còn phụ trách)
    if ((guideRemoved || guideAssignedOrSwapped) && updatedBooking && oldGuideId) {
      mail.unassigned.attempted = true;
      try {
        if (!canSendMail()) {
          mail.unassigned.sent = false;
          mail.unassigned.reason = 'SMTP chưa cấu hình';
        } else {
          const oldGuideUser = await User.findById(oldGuideId).select('name email role status');
          const toEmail = String((oldGuideUser as any)?.email || '').trim();
          const isGuideRole = (oldGuideUser as any)?.role === 'guide' || (oldGuideUser as any)?.role === 'hdv';
          const isActive = (oldGuideUser as any)?.status !== 'inactive';

          if (!toEmail) {
            mail.unassigned.sent = false;
            mail.unassigned.reason = 'HDV cũ không có email';
          } else if (!isGuideRole) {
            mail.unassigned.sent = false;
            mail.unassigned.reason = 'User cũ không phải role guide/hdv';
          } else if (!isActive) {
            mail.unassigned.sent = false;
            mail.unassigned.reason = 'Tài khoản HDV cũ bị khóa';
          } else {
            const tour = await Tour.findById((updatedBooking as any).tour_id).select('name duration_days');
            await sendGuideUnassignmentEmail({
              toEmail,
              guideName: (oldGuideUser as any)?.name,
              bookingId: String((updatedBooking as any)?._id || bookingId),
              tourName: String((tour as any)?.name || (updatedBooking as any)?.tour_id?.name || 'Tour'),
              startDate: (updatedBooking as any)?.startDate,
              endDate: (updatedBooking as any)?.endDate,
            });
            mail.unassigned.sent = true;
            mail.unassigned.reason = '';

            // log vào booking.logs
            await Booking.findByIdAndUpdate(
              bookingId,
              {
                $push: {
                  logs: {
                    time: new Date(),
                    user: currentUser,
                    old: 'Phân công HDV',
                    new: 'Đã gỡ phân công',
                    note: `Đã gửi email thông báo gỡ phân công tới ${toEmail}`,
                  },
                },
              },
              { new: false }
            );
          }
        }
      } catch (e) {
        mail.unassigned.sent = false;
        mail.unassigned.reason = (e as any)?.message || 'Gửi email gỡ phân công thất bại';
        console.error('[mail] Gửi email gỡ phân công thất bại:', e);
      }
    }

    // Cập nhật danh sách khách → tự động phân bổ lại xe & phòng theo số khách thực tế.
    if (shouldReallocateServices) {
      try {
        await autoAllocateCarsForBooking(bookingId);
        await autoAllocateRoomsForBooking(bookingId);
      } catch (e) {
        // Không chặn cập nhật danh sách; phân bổ có thể giữ bản cũ nếu lỗi.
      }
    }

    res.status(200).json({
      status: 'success',
      data: updatedBooking,
      mail
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};
// xóa đơn hàng
export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await VehicleAllocation.deleteMany({ booking_id: bookingId });
    await RoomAllocation.deleteMany({ booking_id: bookingId });
    await Booking.findByIdAndDelete(bookingId);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Giả lập thanh toán MoMo (sandbox/dev) cho đơn booking
export const initMomoPaymentMock = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const { pay_type } = req.body || {};

    const booking: any = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy đơn hàng để thanh toán',
      });
    }

    const currentUser = (req as any).user?.name || 'Khách hàng';
    const total = Number(booking.total_price || 0);
    const method = String(booking.paymentMethod || '').trim() || 'full';
    const currentPaymentStatus = booking.payment_status || LEGACY_PAYMENT_STATUS_MAP[booking.status] || 'unpaid';

    // Không cho thanh toán nếu đã tới/qua ngày khởi hành
    const startDate = booking.startDate ? new Date(booking.startDate) : null;
    if (startDate && Date.now() >= startDate.getTime()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Đã tới hoặc qua ngày khởi hành, không thể thanh toán.',
      });
    }

    // Không cho thanh toán nếu booking đã hủy
    if (String(booking.status || '') === 'cancelled') {
      return res.status(400).json({
        status: 'fail',
        message: 'Đơn đã bị hủy, không thể thanh toán.',
      });
    }

    // Không cho thanh toán lại nếu đã paid
    if (currentPaymentStatus === 'paid') {
      return res.status(400).json({
        status: 'fail',
        message: 'Đơn hàng đã thanh toán đủ. Không thể thanh toán lại.',
      });
    }

    const rawPayType = String(pay_type || '').trim().toLowerCase();
    const normalizedPayType = rawPayType === 'deposit' ? 'deposit' : rawPayType === 'remaining' ? 'remaining' : 'full';

    // Nếu booking chọn "thanh toán sau" thì cho phép thanh toán full hoặc deposit (tuỳ bạn muốn siết chặt)
    // Nếu booking chọn "đặt cọc" thì cho phép deposit trước, và full để thanh toán phần còn lại.
    // Nếu booking chọn "full" thì chỉ cho full.
    if (method === 'full' && normalizedPayType !== 'full') {
      return res.status(400).json({
        status: 'fail',
        message: 'Đơn hàng này yêu cầu thanh toán toàn bộ. Không hỗ trợ đặt cọc.',
      });
    }

    if (currentPaymentStatus === 'deposit' && normalizedPayType === 'deposit') {
      return res.status(400).json({
        status: 'fail',
        message: 'Đơn hàng đã đặt cọc rồi. Vui lòng thanh toán phần còn lại.',
      });
    }

    const existingDepositAmount = Number((booking as any).deposit_amount || 0);
    const computedDepositAmount = Math.round(total * 0.3);
    const depositAmount = existingDepositAmount > 0 ? existingDepositAmount : computedDepositAmount;

    // Backend tự tính số tiền để tránh client sửa amount
    let paymentAmount = 0;
    if (normalizedPayType === 'deposit') paymentAmount = depositAmount;
    else if (normalizedPayType === 'remaining') paymentAmount = Math.max(0, total - depositAmount);
    else paymentAmount = total;

    if (normalizedPayType === 'remaining') {
      if (currentPaymentStatus !== 'deposit') {
        return res.status(400).json({
          status: 'fail',
          message: 'Chỉ có thể thanh toán phần còn lại sau khi đã đặt cọc.',
        });
      }
      if (paymentAmount <= 0) {
        return res.status(400).json({
          status: 'fail',
          message: 'Không còn số tiền nào để thanh toán.',
        });
      }
    }

    // Xác định trạng thái thanh toán mới dựa trên loại thanh toán
    const nextPaymentStatus = normalizedPayType === 'deposit' ? 'deposit' : 'paid';

    const nextDepositAmount = normalizedPayType === 'deposit' ? depositAmount : (existingDepositAmount > 0 ? existingDepositAmount : (method === 'deposit' ? depositAmount : 0));
    const nextPaidAmount = normalizedPayType === 'deposit' ? depositAmount : total;
    const nextRemainingAmount = normalizedPayType === 'deposit' ? Math.max(0, total - depositAmount) : 0;

    // Chuẩn bị log lịch sử thanh toán
    const paymentLog = {
      time: new Date(),
      user: currentUser,
      old: currentPaymentStatus,
      new: nextPaymentStatus,
      note: `Giả lập thanh toán MoMo (${normalizedPayType}) với số tiền ${paymentAmount.toLocaleString('vi-VN')}đ (sandbox/dev)`,
    };

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          payment_status: nextPaymentStatus,
          deposit_amount: nextDepositAmount,
          paid_amount: nextPaidAmount,
          remaining_amount: nextRemainingAmount,
          // đơn đang pending thì khi thanh toán mock thành công sẽ xác nhận luôn
          ...(booking.status === 'pending' ? { status: 'confirmed' } : {}),
        },
        $push: { logs: paymentLog },
      },
      { new: true, runValidators: true }
    );

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUrl = `${clientUrl}/booking/success/${bookingId}?payment=success&gateway=momo&mode=mock`;

    return res.status(200).json({
      status: 'success',
      message: 'Thanh toán giả lập (sandbox) thành công.',
      payUrl: redirectUrl,
      data: updatedBooking,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi khi thực hiện thanh toán giả lập',
    });
  }
};

// admin: tự động phân bổ xe theo ngày cho booking
export const autoAllocateCars = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await autoAllocateCarsForBooking(id);

    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        ...result,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: result.data,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi khi tự động phân bổ xe',
    });
  }
};

export const autoAllocateRooms = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await autoAllocateRoomsForBooking(id);

    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        ...result,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: result.data,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi khi tự động phân bổ phòng',
    });
  }
};

/** Phân bổ xe trước, sau đó phân bổ phòng (cùng logic như cập nhật danh sách khách). */
export const autoAllocateCarsAndRooms = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cars = await autoAllocateCarsForBooking(id);
    if (!cars.success) {
      return res.status(400).json({ status: 'fail', phase: 'cars', ...cars });
    }
    const rooms = await autoAllocateRoomsForBooking(id);
    if (!rooms.success) {
      return res.status(400).json({ status: 'fail', phase: 'rooms', ...rooms });
    }
    return res.status(200).json({
      status: 'success',
      data: { cars: cars.data, rooms: rooms.data },
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi khi phân bổ dịch vụ',
    });
  }
};