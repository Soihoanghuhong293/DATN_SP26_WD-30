import mongoose, { Schema, Document } from 'mongoose';

// 1. Định nghĩa Interface
export interface IBooking extends Document {
  tour_id: mongoose.Types.ObjectId;     // Đổi thành tour_id cho khớp form
  user_id?: mongoose.Types.ObjectId;    // Bỏ bắt buộc (optional)
  guide_id?: mongoose.Types.ObjectId;   // ID của Hướng dẫn viên
  
  // Thông tin khách hàng (trưởng đoàn)
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;

  // Chi tiết booking
  total_price: number;     // Đổi từ price -> total_price
  startDate: Date;
  endDate?: Date;          // Thêm ngày kết thúc
  groupSize: number;
  
  // Nội dung chi tiết & Ghi chú
  schedule_detail?: string;
  service_detail?: string;
  notes?: string;

  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  paymentMethod?: string;
  created_at: Date;
  updated_at: Date;
}

// 2. Định nghĩa Schema
const BookingSchema: Schema = new Schema({
  tour_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Tour', 
    required: [true, 'Booking phải có thông tin Tour!'] 
  },
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    // Bỏ required vì Admin có thể đặt cho khách không có tài khoản hệ thống
  },
  guide_id: {
    type: Schema.Types.ObjectId, 
    ref: 'User' // Giả sử HDV cũng nằm trong bảng User
  },

  // --- THÔNG TIN KHÁCH HÀNG ---
  customer_name: { type: String, required: [true, 'Phải có tên khách hàng!'] },
  customer_phone: { type: String, required: [true, 'Phải có SĐT khách hàng!'] },
  customer_email: { type: String },
  customer_address: { type: String },

  // --- CHI TIẾT ĐƠN ---
  total_price: { 
    type: Number, 
    required: [true, 'Booking phải có tổng tiền!'] 
  },
  startDate: { 
    type: Date, 
    required: [true, 'Booking phải có ngày khởi hành!'] 
  },
  endDate: { type: Date },
  groupSize: { 
    type: Number, 
    required: true, 
    default: 1 
  },

  // --- NỘI DUNG & GHI CHÚ ---
  schedule_detail: { type: String },
  service_detail: { type: String },
  notes: { type: String },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'paid', 'cancelled'],
    default: 'pending' 
  },
  passengers: [{
    name: String,
    birthYear: String,
    gender: String,
    phone: String,
    note: String,
    checkedIn: { type: Boolean, default: false }
  }],
  leaderCheckedIn: { type: Boolean, default: false },
  paymentMethod: { 
    type: String, 
    default: 'offline' 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  // Bật strict: false nếu bạn muốn Mongoose tự động lưu cả các trường động
  // từ Frontend gửi lên (ví dụ: 'qty_Người lớn', 'qty_trẻ em') mà không cần khai báo
  strict: false 
});

export default mongoose.model<IBooking>('Booking', BookingSchema);