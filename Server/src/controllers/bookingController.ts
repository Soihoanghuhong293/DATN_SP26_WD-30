import { Request, Response } from 'express';
import Booking from '../models/Booking'; 
import Tour from '../models/Tour';

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
      .populate('tour_id', 'name duration_days') 
      .populate('guide_id', 'name phone email')  // lấy tên và sdt của hdv
      .populate('user_id', 'name phone email');  
      
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Format lại thời gian cho mảng logs (Đã fix lỗi TypeScript 'string' to 'Date')
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
export const createBooking = async (req: Request, res: Response) => {
  try {
    const { tour_id, startDate, customer_name, customer_phone, groupSize } = req.body;

    // validate các trường bắt buộc
    if (!tour_id || !startDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu tour hoặc ngày khởi hành'
      });
    }

    if (!customer_name || !customer_phone || !groupSize) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu thông tin khách hàng'
      });
    }

    // kiểm tra tour tồn tại
    const tour = await Tour.findById(tour_id);
    if (!tour) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tour không tồn tại'
      });
    }

    const newBookingData = { ...req.body };

    // TỰ ĐỘNG TẠO LỊCH SỬ ĐẦU TIÊN
    const initialStatus = newBookingData.status || 'confirmed';
    newBookingData.logs = [{
      time: new Date(),
      // Đã fix lỗi Property 'user' does not exist
      user: (req as any).user?.name || 'Hệ thống', 
      old: 'Khởi tạo',
      new: initialStatus,
      note: 'Hệ thống tự động duyệt đơn hàng mới'
    }];

    // lưu toàn bộ dữ liệu vào db
    const newBooking = await Booking.create(newBookingData);

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

// CẬP NHẬT ĐƠN HÀNG (Dùng chung cho Đổi trạng thái & Lưu danh sách khách)
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // 1. NẾU FRONTEND GỬI LÊN DANH SÁCH KHÁCH (GUESTS) TỪ EXCEL
    if (req.body.guests) {
      booking.guests = req.body.guests;
    }

    // 2. NẾU CÓ SỰ THAY ĐỔI VỀ TRẠNG THÁI (STATUS) -> SINH RA LOG
    if (req.body.status && req.body.status !== booking.status) {
      booking.logs.push({
        time: new Date(),
        // Đã fix lỗi Property 'user' does not exist
        user: (req as any).user?.name || 'Admin', 
        old: booking.status,
        new: req.body.status,
        note: req.body.note || 'Thay đổi trạng thái đơn'
      });
      booking.status = req.body.status;
    }

    // Cập nhật các trường khác (HDV, Ghi chú, v.v...) nếu có
    const { guests, status, logs, ...restData } = req.body;
    Object.assign(booking, restData);

    // Lưu DB
    await booking.save();

    res.status(200).json({
      status: 'success',
      data: booking
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
    await Booking.findByIdAndDelete(req.params.id);

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