import { Request, Response } from 'express';
import Booking from '../models/Booking'; 
import Tour from '../models/Tour';
import { AuthRequest } from '../middlewares/auth.middleware';

// Lấy danh sách booking của HDV đang đăng nhập 
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

// HDV: lấy chi tiết 1 booking
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

    // format lại thời gian cho log
    const formattedBooking: any = booking.toObject();
    if (!formattedBooking.tour_stage) formattedBooking.tour_stage = 'scheduled';
    if (formattedBooking.logs) {
       formattedBooking.logs = formattedBooking.logs.map((log: any) => ({
         ...log,
         time: log.time ? new Date(log.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''
       })).reverse();
    }

    res.status(200).json({ status: 'success', data: formattedBooking });
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

    // Chỉ cho phép điểm danh khi tour đang diễn ra
    const stage = b.tour_stage || 'scheduled';
    if (stage !== 'in_progress') {
      return res.status(400).json({
        status: 'fail',
        message:
          stage === 'completed'
            ? 'Tour đã kết thúc, không thể điểm danh.'
            : 'Tour chưa bắt đầu, không thể điểm danh.',
      });
    }

    const { type, passengerIndex, day, checkpointIndex } = req.body;

    const hasCheckpoint =
      (typeof day === 'number' || (typeof day === 'string' && String(day).trim() !== '')) &&
      (typeof checkpointIndex === 'number' || (typeof checkpointIndex === 'string' && String(checkpointIndex).trim() !== ''));

    // ===== New: check-in theo từng checkpoint (ngày + chặng) =====
    if (hasCheckpoint) {
      const dayKey = String(day);
      const cpKey = String(checkpointIndex);

      const totalPassengers = Array.isArray(b.passengers) ? b.passengers.length : 0;
      const current = (b.checkpoint_checkins || {}) as any;
      const dayObj = current[dayKey] || {};
      const cpObj = dayObj[cpKey] || { leader: false, passengers: Array(totalPassengers).fill(false) };

      // đồng bộ độ dài passengers nếu có thay đổi
      const normalizedPassengers = Array.isArray(cpObj.passengers) ? cpObj.passengers.slice(0, totalPassengers) : [];
      while (normalizedPassengers.length < totalPassengers) normalizedPassengers.push(false);

      if (type === 'leader') {
        cpObj.leader = !Boolean(cpObj.leader);
      } else if (type === 'passenger' && typeof passengerIndex === 'number') {
        if (passengerIndex < 0 || passengerIndex >= totalPassengers) {
          return res.status(400).json({ status: 'fail', message: 'Chỉ mục khách không hợp lệ' });
        }
        normalizedPassengers[passengerIndex] = !Boolean(normalizedPassengers[passengerIndex]);
        cpObj.passengers = normalizedPassengers;
      } else {
        return res.status(400).json({ status: 'fail', message: 'Thiếu type hoặc passengerIndex' });
      }

      const next = {
        ...current,
        [dayKey]: {
          ...dayObj,
          [cpKey]: {
            leader: Boolean(cpObj.leader),
            passengers: cpObj.passengers || normalizedPassengers,
          },
        },
      };

      const updated = await Booking.findByIdAndUpdate(
        req.params.id,
        { checkpoint_checkins: next },
        { new: true }
      );

      return res.status(200).json({ status: 'success', data: updated });
    }

    // ===== Legacy: check-in 1 lần chung toàn tour =====
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

    // Chỉ cho phép chuyển trạng thái tiến tới (không được quay ngược)
    const currentStage = b.tour_stage || 'scheduled';
    const stageOrder: Record<string, number> = { scheduled: 0, in_progress: 1, completed: 2 };
    const from = stageOrder[currentStage] ?? 0;
    const to = stageOrder[tour_stage] ?? 0;
    if (to < from) {
      return res.status(400).json({
        status: 'fail',
        message: 'Không thể chuyển trạng thái ngược lại.',
      });
    }
    if (to === from) {
      return res.status(200).json({ status: 'success', data: b });
    }
    if (to !== from + 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'Chỉ được chuyển sang trạng thái tiếp theo.',
      });
    }

    // Ghi log tự động khi HDV đổi giai đoạn tour
    b.logs.push({
      time: new Date(),
      user: req.user?.name || 'Hướng dẫn viên',
      old: b.tour_stage || 'scheduled',
      new: tour_stage,
      note: 'HDV cập nhật tiến độ tour'
    });
    b.tour_stage = tour_stage;

    await b.save();

    res.status(200).json({ status: 'success', data: b });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

//admiin

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
      .populate('guide_id', 'name phone email')  
      .populate('user_id', 'name phone email');  
      
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Format lại thời gian cho mảng logs
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

    if (!tour_id || !startDate) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tour hoặc ngày khởi hành' });
    }

    if (!customer_name || !customer_phone || !groupSize) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu thông tin khách hàng' });
    }

    const tour = await Tour.findById(tour_id);
    if (!tour) {
      return res.status(404).json({ status: 'fail', message: 'Tour không tồn tại' });
    }

    const newBookingData = { ...req.body };
    // mặc định trạng thái giai đoạn tour là "sắp khởi hành"
    if (!newBookingData.tour_stage) {
      newBookingData.tour_stage = 'scheduled';
    }

    // tự động tạo lịch sử đầu tiên
    const initialStatus = newBookingData.status || 'confirmed';
    newBookingData.logs = [{
      time: new Date(),
      user: (req as any).user?.name || 'Hệ thống', 
      old: 'Khởi tạo',
      new: initialStatus,
      note: 'Hệ thống tự động duyệt đơn hàng mới'
    }];

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

// quản lí danh sách khách
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const currentUser = (req as any).user?.name || 'Admin';

    //  kiểm tra booking có tồn tại không
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
    }

    //  chuẩn bị dữ liệu update
    const updateData: any = { ...req.body };
    const logsToAdd: any[] = [];

    // cập nhật danh sách hành khác
    const incomingPassengers = req.body.passengers || req.body.guests;
    if (incomingPassengers) {
      // Cảnh báo nếu số lượng lố groupSize
      if (incomingPassengers.length > booking.groupSize) {
        return res.status(400).json({
          status: 'fail',
          message: `Số lượng danh sách (${incomingPassengers.length}) vượt quá số khách đã đặt (${booking.groupSize})!`
        });
      }

      updateData.passengers = incomingPassengers; 
      delete updateData.guests; 

      // Thêm log lịch sử
      logsToAdd.push({
        time: new Date(),
        user: currentUser,
        old: 'Danh sách khách',
        new: 'Đã cập nhật',
        note: `Cập nhật danh sách: ${incomingPassengers.length} hành khách`
      });
    }

    // Nếu có đổi trạng thái
    if (req.body.status && req.body.status !== booking.status) {
      logsToAdd.push({
        time: new Date(),
        user: currentUser,
        old: booking.status,
        new: req.body.status,
        note: req.body.note || 'Thay đổi trạng thái đơn'
      });
    }

    delete updateData.logs;

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: updateData,
        $push: { logs: { $each: logsToAdd } } 
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: updatedBooking
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