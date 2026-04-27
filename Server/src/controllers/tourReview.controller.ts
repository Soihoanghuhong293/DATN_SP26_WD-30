import { Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Tour from '../models/Tour';
import TourReview, { TourSatisfaction } from '../models/TourReview';
import { AuthRequest } from '../middlewares/auth.middleware';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const recomputeTourRating = async (tourId: string) => {
  if (!tourId || !isValidObjectId(tourId)) return;

  const agg = await TourReview.aggregate([
    { $match: { tour_id: new mongoose.Types.ObjectId(tourId), status: 'approved' } },
    {
      $group: {
        _id: '$tour_id',
        avg: { $avg: '$stars' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.[0]?.avg ? Number(agg[0].avg) : 0;
  const count = agg?.[0]?.count ? Number(agg[0].count) : 0;

  await Tour.findByIdAndUpdate(
    tourId,
    { $set: { 'rating.average': avg, 'rating.totalReviews': count } },
    { new: false }
  );
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

    const review = await TourReview.findOne({ booking_id: bookingId, user_id: userId }).populate({
      path: 'tour_id',
      select: 'name slug rating',
    });

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
    const stars = Number(req.body?.stars);
    const satisfactionRaw = String(req.body?.satisfaction || '').trim();
    const satisfaction = (satisfactionRaw || 'normal') as TourSatisfaction;
    const comment = String(req.body?.comment || '').trim();

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ status: 'fail', message: 'booking_id không hợp lệ' });
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ status: 'fail', message: 'Số sao phải từ 1 đến 5' });
    }
    if (!['very_satisfied', 'satisfied', 'normal', 'dissatisfied'].includes(satisfaction)) {
      return res.status(400).json({ status: 'fail', message: 'Mức hài lòng không hợp lệ' });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ status: 'fail', message: 'Nhận xét tối đa 1000 ký tự' });
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

    const tourId = booking.tour_id?.toString?.();
    if (!tourId || !isValidObjectId(tourId)) {
      return res.status(400).json({ status: 'fail', message: 'Booking không có tour hợp lệ' });
    }

    const created = await TourReview.create({
      booking_id: booking._id,
      tour_id: tourId,
      user_id: userId,
      stars,
      satisfaction,
      comment,
      status: 'approved',
    });

    await recomputeTourRating(String(tourId));

    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    if (String(error?.code) === '11000') {
      return res.status(409).json({ status: 'fail', message: 'Booking này đã được đánh giá tour rồi' });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createPublicTourReview = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.body?.tour_id || '').trim();
    const stars = Number(req.body?.stars);
    const guestName = String(req.body?.guest_name || '').trim();

    if (!tourId || !isValidObjectId(tourId)) {
      return res.status(400).json({ status: 'fail', message: 'tour_id không hợp lệ' });
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ status: 'fail', message: 'Số sao phải từ 1 đến 5' });
    }

    const tour = await Tour.findById(tourId).select('_id');
    if (!tour) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy tour' });

    const created = await TourReview.create({
      tour_id: tourId,
      user_id: req.user?._id,
      guest_name: guestName,
      stars,
      status: 'approved',
    });

    await recomputeTourRating(String(tourId));
    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTourReviewSummary = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.params.tourId || '').trim();
    if (!tourId || !isValidObjectId(tourId)) {
      return res.status(400).json({ status: 'fail', message: 'tourId không hợp lệ' });
    }

    const agg = await TourReview.aggregate([
      { $match: { tour_id: new mongoose.Types.ObjectId(tourId), status: 'approved' } },
      {
        $group: {
          _id: '$tour_id',
          avg: { $avg: '$stars' },
          count: { $sum: 1 },
          c1: { $sum: { $cond: [{ $eq: ['$stars', 1] }, 1, 0] } },
          c2: { $sum: { $cond: [{ $eq: ['$stars', 2] }, 1, 0] } },
          c3: { $sum: { $cond: [{ $eq: ['$stars', 3] }, 1, 0] } },
          c4: { $sum: { $cond: [{ $eq: ['$stars', 4] }, 1, 0] } },
          c5: { $sum: { $cond: [{ $eq: ['$stars', 5] }, 1, 0] } },
        },
      },
    ]);

    const avg = agg?.[0]?.avg ? Number(agg[0].avg) : 0;
    const count = agg?.[0]?.count ? Number(agg[0].count) : 0;
    const counts = {
      1: Number(agg?.[0]?.c1 || 0),
      2: Number(agg?.[0]?.c2 || 0),
      3: Number(agg?.[0]?.c3 || 0),
      4: Number(agg?.[0]?.c4 || 0),
      5: Number(agg?.[0]?.c5 || 0),
    } as Record<number, number>;

    const distribution = [5, 4, 3, 2, 1].map((s) => ({
      stars: s,
      count: counts[s],
      percent: count > 0 ? Math.round((counts[s] / count) * 100) : 0,
    }));

    const recent = await TourReview.find({
      tour_id: tourId,
      status: 'approved',
      comment: { $exists: true, $ne: '' },
    })
      .populate({ path: 'user_id', select: 'name email' })
      .sort({ created_at: -1 })
      .limit(2)
      .lean();

    const recentReviews = recent.map((r: any) => ({
      id: String(r?._id || ''),
      name: String(r?.user_id?.name || r?.guest_name || 'Khách'),
      created_at: r?.created_at,
      stars: Number(r?.stars || 0),
      comment: String(r?.comment || '').trim(),
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        average: avg,
        totalReviews: count,
        distribution,
        recentReviews,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listTourReviewsByTour = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.params.tourId || '').trim();
    if (!tourId || !isValidObjectId(tourId)) {
      return res.status(400).json({ status: 'fail', message: 'tourId không hợp lệ' });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const filter: any = { tour_id: tourId, status: 'approved', comment: { $exists: true, $ne: '' } };

    const [rows, total] = await Promise.all([
      TourReview.find(filter)
        .populate({ path: 'user_id', select: 'name email' })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TourReview.countDocuments(filter),
    ]);

    const data = rows.map((r: any) => ({
      id: String(r?._id || ''),
      name: String(r?.user_id?.name || r?.guest_name || 'Khách'),
      created_at: r?.created_at,
      stars: Number(r?.stars || 0),
      comment: String(r?.comment || '').trim(),
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        reviews: data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

