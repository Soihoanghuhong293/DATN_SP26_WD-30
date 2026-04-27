import mongoose, { Schema, Document } from 'mongoose';

export type TourSatisfaction = 'very_satisfied' | 'satisfied' | 'normal' | 'dissatisfied';
export type TourReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ITourReview extends Document {
  booking_id: mongoose.Types.ObjectId;
  tour_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  stars: number;
  satisfaction: TourSatisfaction;
  status: TourReviewStatus;
  created_at: Date;
  updated_at: Date;
}

const TourReviewSchema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    satisfaction: {
      type: String,
      enum: ['very_satisfied', 'satisfied', 'normal', 'dissatisfied'],
      required: true,
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// 1 booking chỉ được review 1 lần
TourReviewSchema.index({ booking_id: 1 }, { unique: true });

export default mongoose.model<ITourReview>('TourReview', TourReviewSchema);

