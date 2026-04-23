import mongoose, { Schema, Document } from 'mongoose';

export type GuideReviewStatus = 'pending' | 'approved' | 'rejected';

export interface IGuideReview extends Document {
  booking_id: mongoose.Types.ObjectId;
  guide_user_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  score: number;
  comment?: string;
  status: GuideReviewStatus;
  created_at: Date;
  updated_at: Date;
}

const GuideReviewSchema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    guide_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// 1 booking chỉ được review 1 lần
GuideReviewSchema.index({ booking_id: 1 }, { unique: true });

export default mongoose.model<IGuideReview>('GuideReview', GuideReviewSchema);

