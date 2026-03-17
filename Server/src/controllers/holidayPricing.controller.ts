import { Request, Response } from 'express';
import HolidayPricing from '../models/HolidayPricing';
import { calculateFinalPrice } from '../services/holidayPricing.service';

// Lấy danh sách tất cả các cấu hình giá ngày lễ
export const getHolidayPricings = async (req: Request, res: Response) => {
  try {
    const pricings = await HolidayPricing.find()
      .populate('tour_id', 'name')
      .sort({ createdAt: -1 }); 
      
    res.status(200).json({ success: true, data: pricings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tính toán giá hiển thị (dùng cho BookingForm bên Frontend)
export const calculatePrice = async (req: Request, res: Response) => {
  try {
    const { tour_id, basePrice, departureDate } = req.body;
    
    if (!tour_id || basePrice === undefined || !departureDate) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin tour_id, basePrice hoặc departureDate' });
    }

    const finalPrice = await calculateFinalPrice(tour_id, basePrice, departureDate);
    res.status(200).json({ success: true, data: finalPrice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  chi tiết một cấu hình giá ngày lễ theo id
export const getHolidayPricingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pricing = await HolidayPricing.findById(id).populate('tour_id', 'name');
    
    if (!pricing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu giá ngày lễ' });
    }
    
    res.status(200).json({ success: true, data: pricing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// thêm
export const createHolidayPricing = async (req: Request, res: Response) => {
  try {
    const newPricing = new HolidayPricing(req.body);
    const savedPricing = await newPricing.save();
    
    res.status(201).json({ success: true, data: savedPricing });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// cập nhật cấu hình giá ngày lễ
export const updateHolidayPricing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const updatedPricing = await HolidayPricing.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true } 
    );

    if (!updatedPricing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu giá ngày lễ' });
    }
    
    res.status(200).json({ success: true, data: updatedPricing });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa 
export const deleteHolidayPricing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedPricing = await HolidayPricing.findByIdAndDelete(id);
    
    if (!deletedPricing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu giá ngày lễ' });
    }
    
    res.status(200).json({ success: true, message: 'Xóa thành công cấu hình giá ngày lễ' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};