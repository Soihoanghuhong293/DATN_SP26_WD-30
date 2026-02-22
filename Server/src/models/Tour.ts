import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify'; // Nhớ chạy: npm install slugify
import type { CallbackWithoutResultAndOptionalError } from "mongoose";


// 1. Định nghĩa Interface (Kiểu dữ liệu cho TypeScript)
export interface ITour extends Document {
  name: string;
  slug?: string;
  description: string;
  category_id?: mongoose.Types.ObjectId; // Khớp với ERD: category_id
  
  // Các trường mảng/phức tạp
  schedule: {
    day: number;
    title: string;
    activities: string[];
  }[];
  
  images: string[];
  
  prices: {
    name: string; // VD: Người lớn, Trẻ em
    price: number;
  }[];

  pesolici: string[];
  suppliers: string[];
  
  price: number; // Giá hiển thị cơ bản
  status: 'active' | 'draft' | 'hidden';
  duration_days: number; // Khớp với ảnh: duration_days
  
  created_at: Date;
  updated_at: Date;
}

// 2. Định nghĩa Schema (Cấu trúc bảng MongoDB)
const TourSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: [true, 'Tour phải có tên'], 
    unique: true,
    trim: true 
  },
  slug: String,
  description: { type: String, required: true },
  
  category_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category', // Liên kết với bảng Category (bạn cần có model Category trước)
    required: false
  },

  schedule: [{
    day: Number,
    title: String,
    activities: [String]
  }],

  images: [String],

  prices: [{
    name: String,
    price: Number
  }],

  policies: [String],
  suppliers: [String],

  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['active', 'draft', 'hidden'],
    default: 'draft'
  },
  
  duration_days: { type: Number, required: true }

}, {
  // Config tự động tạo created_at và updated_at khớp với ảnh
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 3. Middleware: Tự động tạo slug từ name trước khi lưu
TourSchema.pre('save', function () {
   if (!this.isModified('name')) return;

  this.slug = slugify(this.name as string, { lower: true });
});

export default mongoose.model<ITour>('Tour', TourSchema);