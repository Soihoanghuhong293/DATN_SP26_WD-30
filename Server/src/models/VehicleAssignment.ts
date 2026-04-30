import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicleAssignment extends Document {
  trip_key: string; // `${tourId}:${YYYY-MM-DD}`
  tour_id: mongoose.Types.ObjectId;
  trip_date: string; // YYYY-MM-DD

  booking_id?: mongoose.Types.ObjectId;
  guest_key: string; // `${bookingId}:leader` | `${bookingId}:${guestSubId}`

  day_no: number; // day in itinerary (1..duration_days)
  vehicle_allocation_id: mongoose.Types.ObjectId;
  seat_number: string; // e.g. "1", "1A"

  created_at: Date;
  updated_at: Date;
}

const VehicleAssignmentSchema: Schema = new Schema(
  {
    trip_key: { type: String, required: true, index: true, trim: true },
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_date: { type: String, required: true, index: true, trim: true }, // YYYY-MM-DD

    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    guest_key: { type: String, required: true, trim: true, index: true },

    day_no: { type: Number, required: true, min: 1 },
    vehicle_allocation_id: { type: Schema.Types.ObjectId, ref: 'VehicleAllocation', required: true, index: true },
    seat_number: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Mỗi guest chỉ được gán 1 ghế/1 xe trong 1 ngày của trip
VehicleAssignmentSchema.index({ trip_key: 1, day_no: 1, guest_key: 1 }, { unique: true });

// Một ghế trong một xe (allocation) trong 1 ngày của trip chỉ được dùng 1 lần
VehicleAssignmentSchema.index(
  { trip_key: 1, day_no: 1, vehicle_allocation_id: 1, seat_number: 1 },
  { unique: true }
);

export default mongoose.model<IVehicleAssignment>('VehicleAssignment', VehicleAssignmentSchema);

