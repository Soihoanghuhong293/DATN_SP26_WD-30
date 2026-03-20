import { Request, Response } from 'express';
import Booking from '../models/Booking.js';

// API 1: Khởi tạo thanh toán giả lập
export const createMockPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID của booking
    const { amount, pay_type } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Đường dẫn frontend của bạn (mặc định vite chạy port 5173)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Tạo link URL chuyển hướng người dùng sang trang thanh toán giả lập
    const payUrl = `${frontendUrl}/mock-payment?bookingId=${id}&amount=${amount}&type=${pay_type}`;

    res.json({ payUrl });
  } catch (error) {
    console.error('Lỗi khởi tạo thanh toán giả lập:', error);
    res.status(500).json({ message: 'Lỗi khởi tạo thanh toán giả lập' });
  }
};

// API 2: Nhận kết quả thanh toán từ trang giả lập (Webhook Callback mock)
export const handleMockPaymentCallback = async (req: Request, res: Response) => {
  try {
    const { bookingId, status, pay_type } = req.body;

    if (status !== 'success') {
      return res.status(400).json({ message: 'Giao dịch không thành công' });
    }

    const newStatus = pay_type === 'deposit' ? 'deposited' : 'paid';
    
    const paymentLog = {
      time: new Date(),
      user: 'Hệ thống Thanh toán (Mock)',
      old: 'pending/confirmed', // Trạng thái cũ tương đối
      new: newStatus,
      note: `Thanh toán qua MoMo thành công. Hình thức: ${pay_type}`
    };

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        $set: { status: newStatus },
        $push: { logs: paymentLog } 
      },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    res.json({ success: true, message: 'Cập nhật trạng thái thanh toán thành công' });
  } catch (error) {
    console.error('Lỗi cập nhật thanh toán:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật thanh toán' });
  }
};