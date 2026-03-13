import mongoose, { Schema, Document } from 'mongoose';

// 1. Định nghĩa Interface
export interface IBooking extends Document {
  tour_id: mongoose.Types.ObjectId;     
  user_id?: mongoose.Types.ObjectId;    
  guide_id?: mongoose.Types.ObjectId;   
  
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;

  total_price: number;     
  startDate: Date;
  endDate?: Date;          
  groupSize: number;
  
  schedule_detail?: string;
  service_detail?: string;
  notes?: string;

  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  paymentMethod?: string;
  
  // MỚI: Mảng danh sách khách (khớp với Frontend)
  guests: Array<{
    full_name: string;
    gender: string;
    type: string;
    room?: string;
    note?: string;
  }>;

  // MỚI: Mảng lưu lịch sử xử lý
  logs: Array<{
    time: Date;
    user: string;
    old: string;
    new: string;
    note?: string;
  }>;

  created_at: Date;
  updated_at: Date;
}

// 2. Định nghĩa Schema
const BookingSchema: Schema = new Schema({
  
  tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: [true, 'Booking phải có thông tin Tour!'] },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  guide_id: { type: Schema.Types.ObjectId, ref: 'User' },

  customer_name: { type: String, required: [true, 'Phải có tên khách hàng!'] },
  customer_phone: { type: String, required: [true, 'Phải có SĐT khách hàng!'] },
  customer_email: { type: String },
  customer_address: { type: String },

  total_price: { type: Number, required: [true, 'Booking phải có tổng tiền!'] },
  startDate: { type: Date, required: [true, 'Booking phải có ngày khởi hành!'] },
  endDate: { type: Date },
  groupSize: { type: Number, required: true, default: 1 },

  schedule_detail: { type: String },
  service_detail: { type: String },
  notes: { type: String },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'paid', 'cancelled'],
    default: 'confirmed' // Mặc định ban đầu là Đã duyệt theo ý bạn
  },
  
  // Đổi passengers -> guests để khớp với biến guestList gửi từ React
  guests: [{
    full_name: String,
    gender: String,
    type: String,
    room: String,
    note: String
  }],

  // Cấu trúc mảng lịch sử xử lý
  logs: [{
    time: { type: Date, default: Date.now },
    user: String, // Tên người thao tác
    old: String,  // Trạng thái cũ
    new: String,  // Trạng thái mới
    note: String
  }],

  paymentMethod: { type: String, default: 'offline' }
}, 
{
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  strict: false // Cho phép lưu các trường động (qty_Người lớn...)
});

export default mongoose.model<IBooking>('Booking', BookingSchema);