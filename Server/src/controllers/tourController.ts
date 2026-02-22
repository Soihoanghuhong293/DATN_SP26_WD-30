import { Request, Response } from 'express';
import Tour from '../models/Tour';

// 1. GET ALL: Lấy danh sách Tour
export const getAllTours = async (req: Request, res: Response) => {
  try {
    // .populate('category_id') để lấy luôn thông tin danh mục thay vì chỉ hiện ID
    const tours = await Tour.find().populate('category_id');

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: tours
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. GET ONE: Lấy chi tiết 1 Tour
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
    // { new: true } để trả về data mới sau khi update
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!tour) return res.status(404).json({ message: 'Không tìm thấy tour' });

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