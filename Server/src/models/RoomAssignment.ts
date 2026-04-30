import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomAssignment extends Document {
  trip_key: string; // `${tourId}:${YYYY-MM-DD}`
  tour_id: mongoose.Types.ObjectId;
  trip_date: string; // YYYY-MM-DD

  booking_id?: mongoose.Types.ObjectId;
  guest_key: string; // `${bookingId}:leader` | `${bookingId}:${guestSubId}`

  day_no: number; // night number (1..duration_days)
  room_allocation_id: mongoose.Types.ObjectId;
  slot_no: number; // 1..max_occupancy (chỗ trong phòng)

  created_at: Date;
  updated_at: Date;
}

const RoomAssignmentSchema: Schema = new Schema(
  {
    trip_key: { type: String, required: true, index: true, trim: true },
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_date: { type: String, required: true, index: true, trim: true }, // YYYY-MM-DD

    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    guest_key: { type: String, required: true, trim: true, index: true },

    day_no: { type: Number, required: true, min: 1 },
    room_allocation_id: { type: Schema.Types.ObjectId, ref: 'RoomAllocation', required: true, index: true },
    slot_no: { type: Number, required: true, min: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

RoomAssignmentSchema.index({ trip_key: 1, day_no: 1, guest_key: 1 }, { unique: true });

RoomAssignmentSchema.index({ trip_key: 1, day_no: 1, room_allocation_id: 1, slot_no: 1 }, { unique: true });

export default mongoose.model<IRoomAssignment>('RoomAssignment', RoomAssignmentSchema);

