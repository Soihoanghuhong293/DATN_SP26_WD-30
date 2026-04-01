import { Request, Response } from 'express';
import Tour from '../models/Tour';
import Booking from '../models/Booking';
import TourTemplate from '../models/TourTemplate';

const normalizeDateStr = (value: any) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[0];
  return raw;
};

export const getAllTours = async (req: Request, res: Response) => {
  try {
    
    const {
      page = '1',
      limit = '12',
      status,
      search,
      category_id,
      minPrice,
      maxPrice,
      departureDate,
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 12);
    const skip = (pageNum - 1) * limitNum;

    const normalizedStatus = status === 'inactive' ? 'hidden' : status;

    const escapeRegExp = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter: Record<string, any> = {};
    if (normalizedStatus && normalizedStatus.trim() !== '') {
      filter.status = normalizedStatus;
    }
    if (category_id && category_id.trim() !== '') {
      filter.category_id = category_id;
    }

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, any> = {};
      if (minPrice && !Number.isNaN(Number(minPrice))) {
        priceFilter.$gte = Number(minPrice);
      }
      if (maxPrice && !Number.isNaN(Number(maxPrice))) {
        priceFilter.$lte = Number(maxPrice);
      }
      if (Object.keys(priceFilter).length > 0) {
        filter.price = priceFilter;
      }
    }

    if (departureDate && departureDate.trim() !== '') {
      // departure_schedule.date đang lưu dạng string "YYYY-MM-DD"
      filter['departure_schedule.date'] = departureDate.trim();
    }

    if (search && search.trim() !== '') {
      const q = escapeRegExp(search.trim());
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'schedule.title': { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Tour.countDocuments(filter);

    // .populate('category_id') để lấy luôn thông tin danh mục thay vì chỉ hiện ID
    const tours = await Tour.find(filter)
      .populate('category_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      status: 'success',
      results: total,
      total,
      page: pageNum,
      limit: limitNum,
      data: tours
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

//  Lấy chi tiết 1 Tour
export const getTour = async (req: Request, res: Response) => {
  try {
    const tour = await Tour.findById(req.params.id).populate('category_id');
    if (!tour) return res.status(404).json({ message: 'Không tìm thấy tour' });

    res.status(200).json({
      status: 'success',
      data: tour
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. CREATE: Thêm Tour mới
export const createTour = async (req: Request, res: Response) => {
  try {

    console.log("BODY CREATE:", JSON.stringify(req.body, null, 2));

    const payload: any = { ...req.body };

    // validate template tồn tại 
    if (payload.template_id) {
      const tpl = await TourTemplate.findById(payload.template_id);
      if (!tpl) {
        return res.status(400).json({ status: 'fail', message: 'Template không tồn tại' });
      }
    }

    // validate giá > 0
    if (payload.price === undefined || Number(payload.price) <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Giá tour phải lớn hơn 0' });
    }

    // validate ngày hợp lệ + không trùng + slots > 
    const ds = Array.isArray(payload.departure_schedule) ? payload.departure_schedule : [];
    if (!ds.length || !ds[0]?.date) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu ngày khởi hành' });
    }
    const dateStr = normalizeDateStr(ds[0].date);
    const slots = Number(ds[0].slots || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ status: 'fail', message: 'Ngày khởi hành không hợp lệ (YYYY-MM-DD)' });
    }
    if (slots <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Số chỗ phải lớn hơn 0' });
    }
    payload.departure_schedule = [{ date: dateStr, slots }];

    // check trùng ngày cho cùng tên tour 
    if (payload.name) {
      const existed = await Tour.findOne({
        name: String(payload.name).trim(),
        'departure_schedule.date': dateStr,
      });
      if (existed) {
        return res.status(400).json({
          status: 'fail',
          message: 'Tour đã tồn tại với ngày khởi hành này. Vui lòng chọn ngày khác.',
        });
      }
    }

    const newTour = await Tour.create(payload);

    res.status(201).json({
      status: 'success',
      data: newTour
    });
  } catch (error: any) {
    res.status(400).json({ 
      status: 'fail',
      message: error.message 
    });
  }
};
// 4. UPDATE: Sửa Tour
export const updateTour = async (req: Request, res: Response) => {
  try {
    console.log("BODY UPDATE:", JSON.stringify(req.body, null, 2));
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({ message: 'Không tìm thấy tour' });
      
    }

    // không cho sửa itinerary
    if (req.body?.schedule) {
      return res.status(400).json({ status: 'fail', message: 'Không được sửa itinerary (schedule)' });
    }

    // Nếu tour đã có booking: chỉ cho phép cập nhật một số trường "an toàn"
    // (ví dụ: lịch khởi hành để mở thêm ngày mới, nhà cung cấp, trạng thái hiển thị, ảnh, chính sách).
    // Không cho phép chỉnh sửa các trường ảnh hưởng trực tiếp tới booking hiện hữu (giá, thời lượng, danh mục, mô tả...).
    const hasBooking = await Booking.exists({ tour_id: req.params.id, status: { $ne: 'cancelled' } });
    if (hasBooking) {
      const allowedWhenHasBooking = new Set([
        'departure_schedule',
        'suppliers',
        'status',
        'images',
        'policies',
      ]);
      const incomingKeys = Object.keys(req.body || {}).filter((k) => req.body?.[k] !== undefined);
      const invalid = incomingKeys.filter((k) => !allowedWhenHasBooking.has(k));
      if (invalid.length > 0) {
        return res.status(409).json({
          status: 'fail',
          message: `Tour đã có booking, không thể chỉnh sửa các trường: ${invalid.join(', ')}`,
        });
      }
    }

    // validate template tồn tại (nếu có)
    if (req.body?.template_id) {
      const tpl = await TourTemplate.findById(req.body.template_id);
      if (!tpl) return res.status(400).json({ status: 'fail', message: 'Template không tồn tại' });
    }

    // validate giá > 0 (nếu update price)
    if (req.body?.price !== undefined && Number(req.body.price) <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Giá tour phải lớn hơn 0' });
    }

    // validate ngày không trùng (nếu update departure_schedule)
    if (req.body?.departure_schedule) {
      const ds = Array.isArray(req.body.departure_schedule) ? req.body.departure_schedule : [];
      if (!ds.length) {
        return res.status(400).json({ status: 'fail', message: 'Thiếu ngày khởi hành' });
      }

      const normalized = ds
        .map((x: any) => ({
          date: normalizeDateStr(x?.date),
          slots: Number(x?.slots || 0),
        }))
        .filter((x: any) => x.date);

      if (!normalized.length) {
        return res.status(400).json({ status: 'fail', message: 'Thiếu ngày khởi hành' });
      }

      for (const item of normalized) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          return res.status(400).json({ status: 'fail', message: 'Ngày khởi hành không hợp lệ (YYYY-MM-DD)' });
        }
        if (!Number.isFinite(item.slots) || item.slots <= 0) {
          return res.status(400).json({ status: 'fail', message: 'Số chỗ phải lớn hơn 0' });
        }
      }

      // check trùng ngày trong cùng payload
      const dateSet = new Set<string>();
      for (const item of normalized) {
        if (dateSet.has(item.date)) {
          return res.status(400).json({ status: 'fail', message: `Ngày khởi hành bị trùng trong danh sách: ${item.date}` });
        }
        dateSet.add(item.date);
      }

      // check trùng ngày với instance khác (cùng tên tour)
      const dates = Array.from(dateSet);
      const existed = await Tour.findOne({
        _id: { $ne: tour._id },
        name: tour.name,
        'departure_schedule.date': { $in: dates },
      });
      if (existed) {
        return res.status(400).json({ status: 'fail', message: 'Có ngày khởi hành bị trùng với instance khác' });
      }

      (tour as any).departure_schedule = normalized;
    }

    // apply other fields (allow-list)
    const allowed = ['name', 'description', 'category_id', 'images', 'policies', 'suppliers', 'price', 'status', 'duration_days', 'seasonalPrices', 'template_id'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (tour as any)[key] = req.body[key];
    }

    await tour.save(); // đảm bảo slug unique chạy khi name đổi

    res.status(200).json({
      status: 'success',
      data: tour
    });

  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
  
};

// 5. DELETE: Xóa Tour
export const deleteTour = async (req: Request, res: Response) => {
  try {
    const hasBooking = await Booking.exists({ tour_id: req.params.id, status: { $ne: 'cancelled' } });
    if (hasBooking) {
      return res.status(409).json({ status: 'fail', message: 'Tour đã có booking, không thể xoá' });
    }
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};