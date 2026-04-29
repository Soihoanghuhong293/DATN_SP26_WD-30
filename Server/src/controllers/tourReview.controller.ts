import { Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Tour from '../models/Tour';
import TourReview from '../models/TourReview';
import { AuthRequest } from '../middlewares/auth.middleware';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const recomputeTourRating = async (tourId: string) => {
  if (!tourId || !isValidObjectId(tourId)) return;

  const agg = await TourReview.aggregate([
    {
      $match: {
        tour_id: new mongoose.Types.ObjectId(tourId),
        status: 'approved',
      },
    },
    {
      $group: {
        _id: '$tour_id',
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.[0]?.avg ? Number(agg[0].avg) : 0;
  const count = agg?.[0]?.count ? Number(agg[0].count) : 0;

  await Tour.findByIdAndUpdate(
    tourId,
    {
      $set: {
        'rating.average': avg,
        'rating.total_reviews': count,
      },
    },
    { new: false }
  );
};

export const listApprovedTourReviews = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.query.tour_id || '').trim();
    if (!tourId || !isValidObjectId(tourId)) {
      return res.status(400).json({ status: 'fail', message: 'tour_id không hợp lệ' });
    }

    const reviews = await TourReview.find({ tour_id: tourId, status: 'approved' })
      .populate({ path: 'user_id', select: 'name avatar' })
      .sort({ created_at: -1 });

    return res.status(200).json({ status: 'success', results: reviews.length, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMyTourReviewByBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const bookingId = String(req.query.booking_id || '').trim();
    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ status: 'fail', message: 'booking_id không hợp lệ' });
    }

    const review = await TourReview.findOne({ booking_id: bookingId, user_id: userId })
      .populate({ path: 'tour_id', select: 'name slug images' })
      .populate({ path: 'guide_user_id', select: 'name avatar' });

    return res.status(200).json({ status: 'success', data: review || null });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createTourReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const bookingId = String(req.body?.booking_id || '').trim();
    const rating = Number(req.body?.rating);
    const guideRatingRaw = req.body?.guide_rating;
    const guideRating = guideRatingRaw === undefined || guideRatingRaw === null || guideRatingRaw === '' ? undefined : Number(guideRatingRaw);
    const comment = String(req.body?.comment || '').trim();
    const images = Array.isArray(req.body?.images)
      ? req.body.images.filter((x: unknown) => typeof x === 'string' && x.trim().length > 0).slice(0, 8)
      : [];

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ status: 'fail', message: 'booking_id không hợp lệ' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ status: 'fail', message: 'Điểm đánh giá tour phải từ 1 đến 5' });
    }
    if (guideRating !== undefined && (!Number.isFinite(guideRating) || guideRating < 1 || guideRating > 5)) {
      return res.status(400).json({ status: 'fail', message: 'Điểm đánh giá hướng dẫn viên phải từ 1 đến 5' });
    }

    const booking: any = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy booking' });

    const uid = booking.user_id?._id?.toString?.() ?? booking.user_id?.toString?.();
    if (!uid || uid !== userId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền đánh giá booking này' });
    }
    if (String(booking.status || '') === 'cancelled') {
      return res.status(400).json({ status: 'fail', message: 'Booking đã hủy, không thể đánh giá' });
    }
    if (String(booking.tour_stage || 'scheduled') !== 'completed') {
      return res.status(400).json({ status: 'fail', message: 'Tour chưa kết thúc, chưa thể đánh giá' });
    }

    const created = await TourReview.create({
      booking_id: booking._id,
      tour_id: booking.tour_id,
      user_id: userId,
      guide_user_id: booking.guide_id || undefined,
      rating,
      guide_rating: guideRating,
      comment,
      images,
      status: 'pending',
    });

    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    if (String(error?.code) === '11000') {
      return res.status(409).json({ status: 'fail', message: 'Booking này đã được đánh giá rồi' });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateMyTourReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const id = String(req.params.id || '').trim();
    if (!id || !isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'id không hợp lệ' });

    const current = await TourReview.findById(id);
    if (!current) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đánh giá' });
    if (String(current.user_id) !== userId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền sửa đánh giá này' });
    }

    const updateData: Record<string, unknown> = {};
    if (req.body?.rating !== undefined) {
      const rating = Number(req.body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ status: 'fail', message: 'Điểm đánh giá tour phải từ 1 đến 5' });
      }
      updateData.rating = rating;
    }
    if (req.body?.guide_rating !== undefined) {
      const guideRatingRaw = req.body.guide_rating;
      if (guideRatingRaw === null || guideRatingRaw === '') updateData.guide_rating = undefined;
      else {
        const guideRating = Number(guideRatingRaw);
        if (!Number.isFinite(guideRating) || guideRating < 1 || guideRating > 5) {
          return res.status(400).json({ status: 'fail', message: 'Điểm đánh giá hướng dẫn viên phải từ 1 đến 5' });
        }
        updateData.guide_rating = guideRating;
      }
    }
    if (req.body?.comment !== undefined) updateData.comment = String(req.body.comment || '').trim();
    if (req.body?.images !== undefined) {
      updateData.images = Array.isArray(req.body.images)
        ? req.body.images.filter((x: unknown) => typeof x === 'string' && x.trim().length > 0).slice(0, 8)
        : [];
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Không có dữ liệu để cập nhật' });
    }

    // sửa nội dung thì quay về chờ duyệt lại
    updateData.status = 'pending';

    const updated = await TourReview.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteMyTourReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const id = String(req.params.id || '').trim();
    if (!id || !isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'id không hợp lệ' });

    const current = await TourReview.findById(id);
    if (!current) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đánh giá' });
    if (String(current.user_id) !== userId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền xóa đánh giá này' });
    }

    const tourId = String(current.tour_id || '');
    const wasApproved = current.status === 'approved';
    await TourReview.findByIdAndDelete(id);

    if (wasApproved) await recomputeTourRating(tourId);

    return res.status(200).json({ status: 'success', data: null });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const adminListTourReviews = async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const ratingRaw = typeof req.query.rating === 'string' ? req.query.rating.trim() : '';
    const tourId = typeof req.query.tour_id === 'string' ? req.query.tour_id.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter: any = {};
    if (status && ['pending', 'approved', 'hidden'].includes(status)) filter.status = status;
    if (ratingRaw && !Number.isNaN(Number(ratingRaw))) filter.rating = Number(ratingRaw);
    if (tourId && isValidObjectId(tourId)) filter.tour_id = tourId;
    if (q) filter.comment = { $regex: q, $options: 'i' };

    const reviews = await TourReview.find(filter)
      .populate({ path: 'user_id', select: 'name email phone avatar' })
      .populate({ path: 'tour_id', select: 'name slug images rating' })
      .populate({ path: 'booking_id', select: 'startDate endDate tour_stage status payment_status total_price' })
      .populate({ path: 'guide_user_id', select: 'name email phone avatar' })
      .sort({ created_at: -1 });

    return res.status(200).json({ status: 'success', results: reviews.length, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const adminUpdateTourReviewStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || !isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'id không hợp lệ' });

    const status = String(req.body?.status || '').trim();
    if (!['pending', 'approved', 'hidden'].includes(status)) {
      return res.status(400).json({ status: 'fail', message: 'Trạng thái không hợp lệ' });
    }

    const before = await TourReview.findById(id).select('status tour_id');
    if (!before) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đánh giá' });

    const updated = await TourReview.findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .populate({ path: 'user_id', select: 'name email phone avatar' })
      .populate({ path: 'tour_id', select: 'name slug images rating' })
      .populate({ path: 'booking_id', select: 'startDate endDate tour_stage status payment_status total_price' })
      .populate({ path: 'guide_user_id', select: 'name email phone avatar' });

    const oldStatus = String(before.status || '');
    const nextStatus = String(status);
    if ((oldStatus === 'approved' && nextStatus !== 'approved') || (oldStatus !== 'approved' && nextStatus === 'approved')) {
      await recomputeTourRating(String(before.tour_id || ''));
    }

    return res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const adminDeleteTourReview = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || !isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'id không hợp lệ' });

    const deleted = await TourReview.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đánh giá' });

    if (deleted.status === 'approved') {
      await recomputeTourRating(String(deleted.tour_id || ''));
    }

    return res.status(200).json({ status: 'success', data: null });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

