import mongoose, { Schema, Document } from 'mongoose';

export type TourReviewStatus = 'pending' | 'approved' | 'hidden';

export interface ITourReview extends Document {
  booking_id: mongoose.Types.ObjectId;
  tour_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  guide_user_id?: mongoose.Types.ObjectId;
  rating: number;
  guide_rating?: number;
  comment?: string;
  images?: string[];
  status: TourReviewStatus;
  created_at: Date;
  updated_at: Date;
}

const TourReviewSchema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    guide_user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    guide_rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    images: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'hidden'], default: 'pending', index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Mỗi booking chỉ được đánh giá 1 lần
TourReviewSchema.index({ booking_id: 1 }, { unique: true });
TourReviewSchema.index({ tour_id: 1, status: 1, created_at: -1 });

export default mongoose.model<ITourReview>('TourReview', TourReviewSchema);

