import mongoose, { Schema, Document } from 'mongoose';

export interface IHotel extends Document {
  name: string;
  address?: string;
  provider_id?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

const HotelSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model<IHotel>('Hotel', HotelSchema);
