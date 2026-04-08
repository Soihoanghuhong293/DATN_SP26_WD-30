import { Request, Response } from 'express';
import Booking from '../models/Booking';

//  lưu webhook gần nhất để kiểm tra nhanh khi chạy local
let LAST_SEPAY_WEBHOOK: any = null;
export const getLastSepayWebhookDebug = async (req: Request, res: Response) => {
  return res.status(200).json({ success: true, data: LAST_SEPAY_WEBHOOK });
};

// thông tin mb
const BANK_ID = process.env.BANK_ID || 'MB'; 
const ACCOUNT_NO = process.env.ACCOUNT_NO || '120920030000'; 
const ACCOUNT_NAME = process.env.ACCOUNT_NAME || 'PHAM XUAN QUAN';

// khởi tạo thanh toán giả lập
export const createMockPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID của booking
    const { amount, pay_type } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // giả lập
    const payUrl = `${frontendUrl}/mock-payment?bookingId=${id}&amount=${amount}&type=${pay_type}`;

    res.json({ payUrl });
  } catch (error) {
    console.error('Lỗi khởi tạo thanh toán giả lập:', error);
    res.status(500).json({ message: 'Lỗi khởi tạo thanh toán giả lập' });
  }
};

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


// thanh toán thật

export const generateSepayQR = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID của booking
    const { pay_type } = req.query; // 'deposit' hoặc 'full'

    const booking: any = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const total = Number(booking.total_price || 0);
    let amountToPay = Number.isFinite(total) ? total : 0;
    
    const payTypeNorm = String(pay_type || 'full').toLowerCase();

    if (payTypeNorm === 'deposit') {
      const dep = Number(booking.deposit_amount || 0);
      amountToPay = dep > 0 ? dep : Math.round(amountToPay * 0.3);
    } else if (payTypeNorm === 'remaining') {
      // Đã thu thực tế (webhook SePay tích lũy paid_amount); fallback deposit_amount / 30% nếu dữ liệu cũ
      const paidSoFar = Number(booking.paid_amount || 0);
      const dep = Number(booking.deposit_amount || 0);
      let already = Math.max(
        Number.isFinite(paidSoFar) ? paidSoFar : 0,
        Number.isFinite(dep) ? dep : 0
      );
      if (!already && booking.payment_status === 'deposit' && total > 0) {
        already = Math.round(total * 0.3);
      }
      amountToPay = Math.max(0, total - already);
    }

    const transferContent = `SP${id}`; 

    const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact.png?amount=${amountToPay}&addInfo=${transferContent}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    res.json({
      success: true,
      data: {
        bankId: BANK_ID,
        accountNo: ACCOUNT_NO,
        accountName: ACCOUNT_NAME,
        amount: amountToPay,
        transferContent,
        qrUrl
      }
    });
  } catch (error: any) {
    console.error('Lỗi tạo mã QR Sepay:', error);
    res.status(500).json({
      message: 'Lỗi server tạo thanh toán',
      ...(process.env.SEPAY_DEBUG === 'true'
        ? { detail: String(error?.message || error), name: error?.name }
        : {}),
    });
  }
};

//  Xử lý Webhook từ SePay
export const handleSepayWebhook = async (req: Request, res: Response) => {
  try {
  

   
    const body: any = req.body || {};
    const data: any = body.data || body.transaction || body;

    const transactionContent =
      body.transactionContent ??
      body.content ??
      body.description ??
      data.transactionContent ??
      data.content ??
      data.description ??
      "";

    const amountInRaw =
      body.amountIn ??
      body.amount ??
      body.amount_in ??
      body.transferAmount ??
      body.transfer_amount ??
      body.transferValue ??
      body.value ??
      data.amountIn ??
      data.amount ??
      data.amount_in ??
      data.transferAmount ??
      data.transfer_amount ??
      data.transferValue ??
      data.value ??
      0;

    let amountIn = Number(amountInRaw || 0);
    if (!amountIn && Number(body.accumulated) > 0) amountIn = Number(body.accumulated);
    if (!amountIn && Number(data.accumulated) > 0) amountIn = Number(data.accumulated);

    const referenceCode =
      body.referenceCode ??
      body.ref ??
      body.reference ??
      body.txnId ??
      body.transactionId ??
      data.referenceCode ??
      data.ref ??
      data.reference ??
      data.txnId ??
      data.transactionId ??
      "";

    if (process.env.SEPAY_DEBUG === "true") {
      // log ngắn gọn để xem có nhận webhook không (không log quá nhiều dữ liệu nhạy cảm)
      console.log("[sepay] webhook received", {
        hasBody: !!req.body,
        transactionContent: String(transactionContent || "").slice(0, 120),
        amountIn,
        referenceCode: String(referenceCode || "").slice(0, 80),
      });
    }

    LAST_SEPAY_WEBHOOK = {
      receivedAt: new Date().toISOString(),
      parsed: {
        transactionContent,
        amountIn,
        referenceCode,
      },
      headers: {
        host: req.headers?.host,
        "content-type": req.headers?.["content-type"],
        "user-agent": req.headers?.["user-agent"],
      },
      raw: process.env.SEPAY_DEBUG === "true" ? req.body : undefined,
    };

    if (!amountIn || amountIn <= 0) {
      return res.json({ success: true, message: 'Bỏ qua giao dịch không hợp lệ' });
    }

    
    const match = String(transactionContent || "").match(/SP([a-fA-F0-9]{24})/i);
    if (!match) {
      return res.json({ success: true, message: 'Giao dịch không chứa mã Booking ID hợp lệ' });
    }

    const bookingId = match[1];
    const booking: any = await Booking.findById(bookingId);

    if (!booking) {
      return res.json({ success: true, message: 'Đơn hàng không tồn tại' });
    }

    const total = Number(booking.total_price || 0);
    const prevPaid = Number(booking.paid_amount || 0);
    if (total > 0 && prevPaid >= total && booking.payment_status === 'paid') {
      return res.json({ success: true, message: 'Đơn đã thanh toán đủ' });
    }

    const combined = total > 0 ? Math.min(total, prevPaid + amountIn) : prevPaid + amountIn;

    const newPaymentStatus = combined >= total && total > 0 ? 'paid' : 'deposit';

    const paymentLog = {
      time: new Date(),
      user: 'SePay Webhook',
      old: booking.payment_status || 'unpaid',
      new: newPaymentStatus,
      note: `Nhận ${amountIn.toLocaleString('vi-VN')}đ (lũy kế ${combined.toLocaleString('vi-VN')}đ / ${total.toLocaleString('vi-VN')}đ). Mã GD: ${referenceCode}`
    };

    booking.paid_amount = combined;
    booking.remaining_amount = total > 0 ? Math.max(0, total - combined) : 0;
    if (combined > 0 && combined < total) {
      booking.deposit_amount = Math.max(Number(booking.deposit_amount || 0), combined);
    }
    booking.payment_status = newPaymentStatus;
    booking.logs.push(paymentLog);
    await booking.save();

    return res.json({ success: true, message: 'Cập nhật thanh toán thành công' });
  } catch (error) {
    console.error('Lỗi xử lý SePay Webhook:', error);
    // Trả về 200 để SePay không gửi lại nhiều lần nếu lỗi do data hệ thống
    res.status(200).json({ success: false, message: 'Lỗi nội bộ' }); 
  }
};