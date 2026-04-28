import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlistTour extends Document {
  user_id: mongoose.Types.ObjectId;
  tour_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const WishlistTourSchema = new Schema<IWishlistTour>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// 1 user chỉ được yêu thích 1 tour 1 lần
WishlistTourSchema.index({ user_id: 1, tour_id: 1 }, { unique: true });

export default mongoose.model<IWishlistTour>('WishlistTour', WishlistTourSchema);
