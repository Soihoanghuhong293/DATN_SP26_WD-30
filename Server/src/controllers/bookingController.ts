import { Request, Response } from 'express';
import Booking from '../models/Booking'; 
import Tour from '../models/Tour';
import { AuthRequest } from '../middlewares/auth.middleware';

// Lấy danh sách booking của HDV đang đăng nhập (guide_id = user._id)
export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const bookings = await Booking.find({ guide_id: guideId })
      .populate({ path: 'tour_id', select: 'name images duration_days price' })
      .populate({ path: 'user_id', select: 'name email phone' })
      .sort({ startDate: 1 });

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

// HDV: Lấy chi tiết 1 booking (chỉ khi guide_id = user)
export const getMyBookingDetail = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'tour_id', select: 'name schedule duration_days images' })
      .populate({ path: 'user_id', select: 'name email phone' });

    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const bookingGuideId = (booking as any).guide_id?._id?.toString?.() ?? (booking as any).guide_id?.toString?.();
    if (bookingGuideId !== guideId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền xem đơn này' });
    }

    res.status(200).json({ status: 'success', data: booking });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// HDV: Check-in khách (trưởng đoàn hoặc passenger)
export const checkInPassenger = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const b = booking as any;
    const bookingGuideId = b.guide_id?.toString?.();
    if (bookingGuideId !== guideId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền thực hiện' });
    }

    const { type, passengerIndex } = req.body; // type: 'leader' | 'passenger', passengerIndex (nếu passenger)
    let updated;

    if (type === 'leader') {
      updated = await Booking.findByIdAndUpdate(
        req.params.id,
        { leaderCheckedIn: !b.leaderCheckedIn },
        { new: true }
      );
    } else if (type === 'passenger' && typeof passengerIndex === 'number') {
      const passengers = (b.passengers || []).map((p: any, i: number) => {
        const obj = p.toObject ? p.toObject() : p;
        if (i === passengerIndex) {
          return { ...obj, checkedIn: !obj.checkedIn };
        }
        return obj;
      });
      if (passengers[passengerIndex]) {
        updated = await Booking.findByIdAndUpdate(
          req.params.id,
          { passengers },
          { new: true }
        );
      } else {
        return res.status(400).json({ status: 'fail', message: 'Chỉ mục khách không hợp lệ' });
      }
    } else {
      return res.status(400).json({ status: 'fail', message: 'Thiếu type hoặc passengerIndex' });
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// HDV: Cập nhật giai đoạn tour
export const updateTourStage = async (req: AuthRequest, res: Response) => {
  try {
    const guideId = req.user?._id;
    if (!guideId) {
      return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    const b = booking as any;
    const bookingGuideId = b.guide_id?.toString?.();
    if (bookingGuideId !== guideId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền thực hiện' });
    }

    const { tour_stage } = req.body;
    const validStages = ['scheduled', 'in_progress', 'completed'];
    if (!tour_stage || !validStages.includes(tour_stage)) {
      return res.status(400).json({ status: 'fail', message: 'tour_stage không hợp lệ' });
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { tour_stage },
      { new: true }
    );

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// lấy tất cả đơn đặt tour
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find()
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

// tyạo đơn đặt tour mới
export const createBooking = async (req: Request, res: Response) => {
  try {
    console.log('Dữ liệu Frontend gửi lên:', req.body); 

    
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

    // lưu toàn bộ dữ liệu vào db
    const newBooking = await Booking.create({
      ...req.body
    });

    console.log('Tạo Booking thành công:', newBooking._id);

    res.status(201).json({
      status: 'success',
      data: newBooking
    });

  } catch (error: any) {
    console.error('Lỗi khi tạo booking:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message || 'Lỗi khi tạo đơn hàng'
    });
  }
};

// cập nhật trạng thái đơn hàng
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