import mongoose, { Document, Schema } from 'mongoose';

export interface IHolidayPricing extends Document {
  name: string;
  tour_id?: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  price_multiplier: number;
  fixed_price?: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

//  tạo schema với generic type 
const holidayPricingSchema = new Schema<IHolidayPricing>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  tour_id: {
    type: Schema.Types.ObjectId,
    ref: 'Tour',
    required: false, // nếu k truyền sẽ áp dụng cho tất cả tour
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
  price_multiplier: {
    type: Number,
    default: 1.0, 
  },
  fixed_price: {
    type: Number,
    required: false, 
  },
  priority: {
    type: Number,
    default: 0, //ưu tiên nếu trùng ngày
  }
}, { timestamps: true });

holidayPricingSchema.index({ start_date: 1, end_date: 1 });
holidayPricingSchema.index({ tour_id: 1 });

export default mongoose.model<IHolidayPricing>('HolidayPricing', holidayPricingSchema);