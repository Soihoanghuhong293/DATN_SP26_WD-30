import mongoose, { Schema, Document } from 'mongoose';

export interface ITripVehicle extends Document {
  tour_id: mongoose.Types.ObjectId;
  trip_key: string; // `${tourId}:${YYYY-MM-DD}`
  trip_date: string; // YYYY-MM-DD

  vehicle_id: mongoose.Types.ObjectId;
  plate?: string; // snapshot (optional)
  seat_count: number;

  created_at: Date;
  updated_at: Date;
}

const TripVehicleSchema: Schema = new Schema(
  {
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_key: { type: String, required: true, trim: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true },

    vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    plate: { type: String, trim: true },
    seat_count: { type: Number, required: true, min: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// 1 trip không add trùng 1 xe
TripVehicleSchema.index({ trip_key: 1, vehicle_id: 1 }, { unique: true });

export default mongoose.model<ITripVehicle>('TripVehicle', TripVehicleSchema);

