import { Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import GuideReview from '../models/GuideReview';
import Guide from '../models/Guide';
import { AuthRequest } from '../middlewares/auth.middleware';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const recomputeGuideRating = async (guideUserId: string) => {
  if (!guideUserId || !isValidObjectId(guideUserId)) return;

  const agg = await GuideReview.aggregate([
    { $match: { guide_user_id: new mongoose.Types.ObjectId(guideUserId) } },
    {
      $group: {
        _id: '$guide_user_id',
        avg: { $avg: '$score' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.[0]?.avg ? Number(agg[0].avg) : 0;
  const count = agg?.[0]?.count ? Number(agg[0].count) : 0;

  await Guide.findOneAndUpdate(
    { user_id: guideUserId },
    {
      $set: {
        'rating.average': avg,
        'rating.totalReviews': count,
      },
    },
    { new: false }
  );
};

export const adminListGuideReviews = async (req: AuthRequest, res: Response) => {
  try {
    const role = String((req.user as any)?.role || '');
    if (role !== 'admin') return res.status(403).json({ status: 'fail', message: 'Chỉ Quản trị viên mới có quyền thực hiện' });

    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const scoreRaw = typeof req.query.score === 'string' ? req.query.score.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''; // tìm theo nội dung đánh giá
    const customerName = typeof req.query.customer_name === 'string' ? req.query.customer_name.trim() : '';
    const guideUserId = typeof req.query.guide_user_id === 'string' ? req.query.guide_user_id.trim() : '';
    const tourId = typeof req.query.tour_id === 'string' ? req.query.tour_id.trim() : '';

    const filter: any = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) filter.status = status;
    if (scoreRaw && !Number.isNaN(Number(scoreRaw))) filter.score = Number(scoreRaw);
    if (guideUserId && isValidObjectId(guideUserId)) filter.guide_user_id = guideUserId;

    // tìm theo comment (nhanh, không join)
    if (q) {
      filter.$or = [{ comment: { $regex: q, $options: 'i' } }];
    }

    const reviewsQuery = GuideReview.find(filter)
      .populate({ path: 'user_id', select: 'name email phone' })
      .populate({ path: 'guide_user_id', select: 'name email phone avatar' })
      .populate({
        path: 'booking_id',
        select: 'startDate endDate tour_stage status payment_status total_price tour_id',
        populate: { path: 'tour_id', select: 'name slug' },
      })
      .sort({ created_at: -1 });

    let reviews: any[] = await reviewsQuery;

    // lọc theo tour (dựa trên booking.tour_id)
    if (tourId && isValidObjectId(tourId)) {
      reviews = reviews.filter((r) => String(r?.booking_id?.tour_id?._id || r?.booking_id?.tour_id || '') === tourId);
    }

    // tìm theo tên khách
    if (customerName) {
      const re = new RegExp(customerName, 'i');
      reviews = reviews.filter((r) => re.test(String(r?.user_id?.name || '')));
    }

    return res.status(200).json({ status: 'success', results: reviews.length, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const adminUpdateGuideReviewStatus = async (req: AuthRequest, res: Response) => {
  try {
    const role = String((req.user as any)?.role || '');
    if (role !== 'admin') return res.status(403).json({ status: 'fail', message: 'Chỉ Quản trị viên mới có quyền thực hiện' });

    const id = String(req.params.id || '').trim();
    if (!id || !isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'id không hợp lệ' });

    const status = String(req.body?.status || '').trim();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ status: 'fail', message: 'Trạng thái không hợp lệ' });
    }

    const updated = await GuideReview.findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .populate({ path: 'user_id', select: 'name email phone' })
      .populate({ path: 'guide_user_id', select: 'name email phone avatar' })
      .populate({ path: 'booking_id', select: 'startDate endDate tour_stage status payment_status total_price' });

    if (!updated) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đánh giá' });
    return res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const adminDeleteGuideReview = async (req: AuthRequest, res: Response) => {
  try {
    const role = String((req.user as any)?.role || '');
    if (role !== 'admin') return res.status(403).json({ status: 'fail', message: 'Chỉ Quản trị viên mới có quyền thực hiện' });

    const id = String(req.params.id || '').trim();
    if (!id || !isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'id không hợp lệ' });

    const deleted = await GuideReview.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đánh giá' });

    await recomputeGuideRating(String((deleted as any).guide_user_id || ''));

    return res.status(200).json({ status: 'success', data: null });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

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

    await recomputeGuideRating(String(guideUserId));

    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    // duplicate booking_id unique
    if (String(error?.code) === '11000') {
      return res.status(409).json({ status: 'fail', message: 'Booking này đã được đánh giá rồi' });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

