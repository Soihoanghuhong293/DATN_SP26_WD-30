import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  hotel_id: mongoose.Types.ObjectId;
  room_number: string;
  max_occupancy: number;
  status: 'active' | 'inactive';
  provider_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const RoomSchema: Schema = new Schema(
  {
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    room_number: { type: String, required: true, trim: true },
    max_occupancy: { type: Number, required: true, min: 1, default: 2 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider', index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

RoomSchema.index({ hotel_id: 1, room_number: 1 }, { unique: true });

export default mongoose.model<IRoom>('Room', RoomSchema);
