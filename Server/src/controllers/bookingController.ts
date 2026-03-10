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
      .populate({ path: 'tour_id', select: 'name images price duration_days' })
      .populate({ path: 'user_id', select: 'name email phone' });

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
    console.log('Received booking request:', req.body); // Debug log

    // 1️⃣ Lấy dữ liệu từ Frontend gửi lên
    const { tour_id, startDate, customerName, phone, email, groupSize, paymentMethod } = req.body;

    // 2️⃣ Validate các trường bắt buộc
    if (!tour_id || !startDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu tour hoặc ngày khởi hành'
      });
    }

    if (!customerName || !phone || !email || !groupSize) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu thông tin khách hàng'
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

    // 4️⃣ Tính tổng tiền (giả sử giá tour * số lượng khách)
    const total_price = (tour.price || 0) * groupSize;

    // 5️⃣ Xác định trạng thái
    const status = paymentMethod === 'full' ? 'paid' : 'pending';

    // 6️⃣ Chuẩn bị dữ liệu lưu vào Database
    const bookingPayload = {
      tour_id,
      startDate,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: email,
      groupSize,
      paymentMethod,
      total_price,
      status,
    };

    console.log('Saving booking:', bookingPayload); // Debug log

    // 7️⃣ Tạo booking
    const newBooking = await Booking.create(bookingPayload);

    console.log('Booking created successfully:', newBooking); // Debug log

    res.status(201).json({
      status: 'success',
      data: newBooking
    });

  } catch (error: any) {
    console.error('Error creating booking:', error); // Debug log
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