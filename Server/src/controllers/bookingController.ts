import { Request, Response } from 'express';
import Booking from '../models/Booking'; // Đảm bảo import đúng Schema mới
import Tour from '../models/Tour';

// 1. ADMIN: Lấy tất cả đơn đặt tour
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find()
      // Đổi path thành tour_id và user_id cho khớp Schema
      .populate({ path: 'tour_id', select: 'name images duration_days price' })
      .populate({ path: 'user_id', select: 'name email phone' })
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

// 2. ADMIN/USER: Lấy chi tiết 1 đơn hàng
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

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 3. ADMIN/USER: Tạo đơn đặt tour mới
export const createBooking = async (req: Request, res: Response) => {
  try {
    // 1️⃣ Lấy dữ liệu từ Frontend gửi lên
    const { tour_id, startDate, customer_name, customer_phone, total_price } = req.body;

    // 2️⃣ Validate các trường bắt buộc
    if (!tour_id || !startDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu tour hoặc ngày khởi hành'
      });
    }

    if (!customer_name || !customer_phone) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu thông tin khách hàng (tên hoặc số điện thoại)'
      });
    }

    if (total_price === undefined || total_price === null) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu tổng tiền của đơn hàng'
      });
    }

    // 3️⃣ Kiểm tra tour tồn tại
    const tour = await Tour.findById(tour_id);
    if (!tour) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tour không tồn tại'
      });
    }

    // 4️⃣ Chuẩn bị dữ liệu lưu vào Database
    const bookingPayload = { ...req.body };

    // Mongoose sẽ báo lỗi nếu truyền ID là chuỗi rỗng/undefined. 
    // Nếu không có user_id hoặc guide_id, ta xóa khỏi payload trước khi lưu
    if (!bookingPayload.user_id) delete bookingPayload.user_id;
    if (!bookingPayload.guide_id) delete bookingPayload.guide_id;

    // 5️⃣ Tạo booking
    const newBooking = await Booking.create(bookingPayload);

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

// 4. ADMIN: Cập nhật trạng thái đơn hàng
export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy đơn hàng'
      });
    }

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

// 5. ADMIN: Xóa đơn hàng
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