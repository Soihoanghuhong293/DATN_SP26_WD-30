import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomAllocation extends Document {
  booking_id: mongoose.Types.ObjectId;
  room_id: mongoose.Types.ObjectId;
  hotel_id: mongoose.Types.ObjectId;
  hotel_name: string;
  room_number: string;
  provider_id?: mongoose.Types.ObjectId;
  day_no: number;
  service_date: Date;
  max_occupancy: number;
  status: 'reserved' | 'confirmed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

const RoomAllocationSchema: Schema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    room_id: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    hotel_name: { type: String, required: true, trim: true },
    room_number: { type: String, required: true, trim: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider' },
    day_no: { type: Number, required: true, min: 1 },
    service_date: { type: Date, required: true, index: true },
    max_occupancy: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['reserved', 'confirmed', 'cancelled'], default: 'reserved' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

RoomAllocationSchema.index(
  { room_id: 1, service_date: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['reserved', 'confirmed'] },
    },
  }
);

RoomAllocationSchema.index({ booking_id: 1, day_no: 1 });

export default mongoose.model<IRoomAllocation>('RoomAllocation', RoomAllocationSchema);
