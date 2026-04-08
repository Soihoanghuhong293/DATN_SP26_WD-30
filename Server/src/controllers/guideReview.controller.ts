import { Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import GuideReview from '../models/GuideReview';
import { AuthRequest } from '../middlewares/auth.middleware';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getMyGuideReviewByBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const bookingId = String(req.query.booking_id || '').trim();
    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ status: 'fail', message: 'booking_id không hợp lệ' });
    }

    const review = await GuideReview.findOne({ booking_id: bookingId, user_id: userId })
      .populate({ path: 'guide_user_id', select: 'name email avatar' });

    return res.status(200).json({ status: 'success', data: review || null });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createGuideReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const bookingId = String(req.body?.booking_id || '').trim();
    const score = Number(req.body?.score);
    const comment = String(req.body?.comment || '').trim();

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ status: 'fail', message: 'booking_id không hợp lệ' });
    }
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return res.status(400).json({ status: 'fail', message: 'Điểm đánh giá phải từ 1 đến 5' });
    }

    const booking: any = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy booking' });

    const uid = booking.user_id?._id?.toString?.() ?? booking.user_id?.toString?.();
    if (!uid || uid !== userId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền đánh giá booking này' });
    }

    if (String(booking.status) === 'cancelled') {
      return res.status(400).json({ status: 'fail', message: 'Booking đã hủy, không thể đánh giá' });
    }

    const stage = String(booking.tour_stage || 'scheduled');
    if (stage !== 'completed') {
      return res.status(400).json({ status: 'fail', message: 'Tour chưa kết thúc, chưa thể đánh giá' });
    }

    const guideUserId = booking.guide_id?.toString?.();
    if (!guideUserId) {
      return res.status(400).json({ status: 'fail', message: 'Booking chưa có hướng dẫn viên để đánh giá' });
    }

    const created = await GuideReview.create({
      booking_id: booking._id,
      guide_user_id: guideUserId,
      user_id: userId,
      score,
      comment,
      status: 'approved',
    });

    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    // duplicate booking_id unique
    if (String(error?.code) === '11000') {
      return res.status(409).json({ status: 'fail', message: 'Booking này đã được đánh giá rồi' });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

