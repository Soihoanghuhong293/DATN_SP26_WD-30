import { Request, Response, NextFunction } from 'express';
import Guide from '../models/Guide'; // Thêm .js nếu project của bạn yêu cầu
import User from '../models/user.model';
import GuideReview from '../models/GuideReview';
import TourReview from '../models/TourReview';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import mongoose from 'mongoose';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const ensureGuideDocsForGuideUsers = async () => {
  // Đồng bộ: mọi User role guide/hdv đều có 1 Guide document
  const guideUsers = await User.find({ role: { $in: ['guide', 'hdv'] } }).select('_id name email');
  if (!guideUsers.length) return;

  const existing = await Guide.find({ user_id: { $in: guideUsers.map((u) => u._id) } }).select('user_id');
  const existingSet = new Set(existing.map((g: any) => String(g.user_id)));

  const toCreate = guideUsers.filter((u) => !existingSet.has(String(u._id)));
  if (!toCreate.length) return;

  await Guide.insertMany(
    toCreate.map((u) => ({
      user_id: u._id,
      name: u.name || u.email || 'Hướng dẫn viên',
      email: u.email,
      // Một số DB đã tạo unique index `phone_1` không-sparse từ trước,
      // nên nhiều doc thiếu phone sẽ bị hiểu là null và trùng unique.
      // Dùng giá trị placeholder unique để tránh lỗi và vẫn cho phép admin cập nhật sau.
      phone: `AUTO-${String(u._id)}`,
      languages: ['Vietnamese'],
      experience: { years: 0 },
      group_type: 'domestic',
      health_status: 'healthy',
      history: [],
      rating: { average: 0, totalReviews: 0, reviews: [] },
    })),
    { ordered: false }
  );
};

const recomputeAllGuideRatings = async () => {
  const guideReviewAgg = await GuideReview.aggregate([
    {
      $match: {
        status: 'approved',
      },
    },
    {
      $group: {
        _id: '$guide_user_id',
        avg: { $avg: '$score' },
        count: { $sum: 1 },
      },
    },
  ]);

  const tourReviewAgg = await TourReview.aggregate([
    {
      $match: {
        status: 'approved',
        guide_rating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$guide_user_id',
        avg: { $avg: '$guide_rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const statMap = new Map<string, { sum: number; count: number }>();
  const collect = (arr: any[]) => {
    for (const row of arr) {
      const id = String(row?._id || '');
      if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
      const avg = Number(row?.avg || 0);
      const count = Number(row?.count || 0);
      if (count <= 0) continue;
      const prev = statMap.get(id) || { sum: 0, count: 0 };
      prev.sum += avg * count;
      prev.count += count;
      statMap.set(id, prev);
    }
  };

  collect(guideReviewAgg);
  collect(tourReviewAgg);

  if (!statMap.size) {
    // nếu chưa có review nào thì không cần bulk update
    return;
  }

  await Guide.bulkWrite(
    Array.from(statMap.entries()).map(([guideUserId, stats]) => ({
        updateOne: {
          filter: { user_id: guideUserId },
          update: {
            $set: {
              'rating.average': Number(stats.count > 0 ? stats.sum / stats.count : 0),
              'rating.totalReviews': Number(stats.count || 0),
            },
          },
        },
      })),
    { ordered: false }
  );
};

// 1. Lấy danh sách hướng dẫn viên
export const getAllGuides = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Auto-sync để danh sách HDV luôn khớp với bảng User
  await ensureGuideDocsForGuideUsers();
  // Backfill rating từ bảng GuideReview để UI luôn đúng (kể cả review cũ)
  await recomputeAllGuideRatings();

  const { group_type, health_status, search, language } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = {};
  if (group_type) filter.group_type = group_type;
  if (health_status) filter.health_status = health_status;
  if (language) filter.languages = language;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const skip = (page - 1) * limit;

  const guides = await Guide.find(filter)
    .populate('user_id', 'email status role') // Lấy thêm email và status từ bảng User
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Guide.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      guides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// 2. Lấy chi tiết một hướng dẫn viên
export const getGuideById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Đã ép kiểu id as string để tránh lỗi TS
  if (!isValidObjectId(id as string)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  const guide = await Guide.findById(id)
    .populate('user_id', 'email status')
    .populate('history.tourId');

  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { guide },
  });
});

// 2b. HDV: Lấy profile guide của chính mình (theo user_id)
export const getMyGuideProfile = catchAsync(async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  if (!userId) return next(new AppError('Vui lòng đăng nhập', 401));
  const role = String(req.user?.role || '');
  if (role !== 'guide' && role !== 'hdv' && role !== 'admin') {
    return next(new AppError('Chỉ HDV mới có quyền xem mục này', 403));
  }

  // ensure guide doc exists for guide/hdv users
  await ensureGuideDocsForGuideUsers();
  await recomputeAllGuideRatings();

  const guide = await Guide.findOne({ user_id: userId })
    .populate('user_id', 'email status role')
    .lean();
  if (!guide) return next(new AppError('Guide not found', 404));

  return res.status(200).json({ status: 'success', data: { guide } });
});

// 3. Tạo hướng dẫn viên mới (Dùng khi cần tạo thủ công, bình thường sẽ auto-sync từ User)
export const createGuide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const {
    user_id, name, birtdate, avatar, phone, email, address, identityCard,
    certificate, languages, experience, group_type, health_status,
  } = req.body;

  if (!user_id || !name) {
    return next(new AppError('Missing required fields: user_id, name', 400));
  }

  // Check duplicate phone if provided
  if (phone) {
    const existingPhone = await Guide.findOne({ phone });
    if (existingPhone) {
      return next(new AppError('Phone number already exists', 400));
    }
  }

  const newGuide = await Guide.create({
    user_id, name, birtdate, avatar, phone, email, address, identityCard,
    certificate: certificate || [],
    languages: languages || ['Vietnamese'],
    experience: experience || { years: 0 },
    group_type: group_type || 'domestic',
    health_status: health_status || 'healthy',
    history: [],
    rating: { average: 0, totalReviews: 0, reviews: [] },
  });

  res.status(201).json({
    status: 'success',
    data: { guide: newGuide },
  });
});

// 4. Cập nhật thông tin hướng dẫn viên
export const updateGuide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!isValidObjectId(id as string)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  const guide = await Guide.findById(id);
  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  const { phone } = req.body;
  if (phone && phone !== guide.phone) {
    const existingPhone = await Guide.findOne({ phone });
    if (existingPhone) {
      return next(new AppError('Phone number already exists', 400));
    }
  }

  const updatedGuide = await Guide.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
    .populate('user_id', 'email status');

  res.status(200).json({
    status: 'success',
    data: { guide: updatedGuide },
  });
});

// 5. Thêm đánh giá cho hướng dẫn viên
export const addGuideRating = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { score, comment, reviewedBy } = req.body;

  if (!isValidObjectId(id as string)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  if (!score || score < 1 || score > 5) {
    return next(new AppError('Score must be between 1 and 5', 400));
  }

  const guide = await Guide.findById(id);
  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  guide.rating.reviews.push({
    score,
    comment,
    date: new Date(),
    reviewedBy,
  });

  const totalScore = guide.rating.reviews.reduce((sum, review) => sum + review.score, 0);
  guide.rating.average = totalScore / guide.rating.reviews.length;
  guide.rating.totalReviews = guide.rating.reviews.length;

  await guide.save();

  res.status(200).json({
    status: 'success',
    data: { guide },
  });
});

// 6. Thêm lịch sử dẫn tour (Đã fix lỗi TypeScript Object Id)
export const addTourHistory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { tourId, tourName, startDate, endDate, groupSize } = req.body;

  if (!isValidObjectId(id as string)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  if (!tourName || !startDate || !endDate) {
    return next(new AppError('Missing required fields: tourName, startDate, endDate', 400));
  }

  const guide = await Guide.findById(id);
  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  // Khai báo kiểu any tạm để linh hoạt thêm thuộc tính tourId
  const tourHistory: any = {
    tourName,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    groupSize,
  };

  // Chỉ gán tourId nếu client có truyền lên (Tránh gán undefined)
  if (tourId) {
    tourHistory.tourId = new mongoose.Types.ObjectId(tourId as string);
  }

  guide.history.push(tourHistory);
  await guide.save();

  res.status(200).json({
    status: 'success',
    data: { guide },
  });
});

// 7. Xóa hướng dẫn viên
export const deleteGuide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!isValidObjectId(id as string)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  const guide = await Guide.findByIdAndDelete(id);

  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// 8. Thống kê hướng dẫn viên theo nhóm
export const getGuideStatistics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const groupStats = await Guide.aggregate([
    {
      $group: {
        _id: '$group_type',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating.average' },
      },
    },
  ]);

  const healthStats = await Guide.aggregate([
    {
      $group: {
        _id: '$health_status',
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      groupStats,
      healthStats,
    },
  });
});