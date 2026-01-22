import mongoose, { Schema, Document } from 'mongoose';

export interface ITour extends Document {
  name: string; // Tương ứng description/name trong ERD
  description: string;
  category: mongoose.Types.ObjectId;
  basePrice: number;
  duration: number; // Số ngày
  images: string[];
  schedule: {
    day: number;
    title: string;
    activities: string[];
  }[];
  startDates: Date[]; // Lịch khởi hành
  maxGroupSize: number;
  slug: string;
}

const TourSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  basePrice: { type: Number, required: true },
  duration: { type: Number, required: true },
  images: [String],
  schedule: [{
    day: Number,
    title: String,
    activities: [String]
  }],
  startDates: [Date],
  maxGroupSize: { type: Number, default: 20 },
  slug: { type: String, unique: true }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, // Khớp với ERD
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index để tìm kiếm nhanh
TourSchema.index({ basePrice: 1, duration: 1 });
TourSchema.index({ slug: 1 });

export default mongoose.model<ITour>('Tour', TourSchema);