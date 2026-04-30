import mongoose, { Schema, Document } from 'mongoose';

export interface ISeatingAllocation extends Document {
  tour_id: mongoose.Types.ObjectId;
  trip_key: string;
  trip_date: string;

  trip_vehicle_id: mongoose.Types.ObjectId;
  passenger_id: mongoose.Types.ObjectId;
  seat_code: string; // 1A, 2B... (demo có thể dùng số "1","2"...)

  created_at: Date;
  updated_at: Date;
}

const SeatingAllocationSchema: Schema = new Schema(
  {
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_key: { type: String, required: true, trim: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true },

    trip_vehicle_id: { type: Schema.Types.ObjectId, ref: 'TripVehicle', required: true, index: true },
    passenger_id: { type: Schema.Types.ObjectId, ref: 'Passenger', required: true, index: true },
    seat_code: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// 1 ghế trong 1 xe/trip chỉ dùng 1 lần
SeatingAllocationSchema.index({ trip_vehicle_id: 1, seat_code: 1 }, { unique: true });
// 1 passenger trong 1 trip chỉ có 1 ghế
SeatingAllocationSchema.index({ trip_key: 1, passenger_id: 1 }, { unique: true });

export default mongoose.model<ISeatingAllocation>('SeatingAllocation', SeatingAllocationSchema);

