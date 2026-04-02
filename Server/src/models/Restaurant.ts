import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  phone?: string;
  capacity: number;
  location?: string;
  provider_id: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

const RestaurantSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    capacity: { type: Number, required: true, min: 1 },
    location: { type: String, default: '', trim: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);

