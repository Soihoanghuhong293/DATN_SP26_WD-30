import { Request, Response } from 'express';
import Tour from '../models/Tour';

// 1. GET ALL: Lấy danh sách Tour
export const getAllTours = async (req: Request, res: Response) => {
  try {
    // Supports: page, limit, status, search, category_id, minPrice, maxPrice, departureDate
    // Example: GET /api/v1/tours?page=1&limit=12&status=active&search=hanoi&minPrice=1000000&maxPrice=5000000
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

    // Note: UI currently uses 'inactive' for filtering, but backend stores 'hidden'
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

    const newTour = await Tour.create(req.body);

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
    const tour = await Tour.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
          seasonalPrices: req.body.seasonalPrices
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!tour) {
      return res.status(404).json({ message: 'Không tìm thấy tour' });
      
    }

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
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};