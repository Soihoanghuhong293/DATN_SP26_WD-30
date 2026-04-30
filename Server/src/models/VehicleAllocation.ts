import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicleAllocation extends Document {
  booking_id?: mongoose.Types.ObjectId;
  tour_id?: mongoose.Types.ObjectId;
  trip_key?: string; // `${tourId}:${YYYY-MM-DD}`
  vehicle_id: mongoose.Types.ObjectId;
  plate: string;
  provider_id?: mongoose.Types.ObjectId;
  day_no: number;
  service_date: Date;
  capacity: number;
  status: 'reserved' | 'confirmed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

const VehicleAllocationSchema: Schema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', index: true },
    trip_key: { type: String, trim: true, index: true },
    vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    plate: { type: String, required: true, trim: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider' },
    day_no: { type: Number, required: true, min: 1 },
    service_date: { type: Date, required: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['reserved', 'confirmed', 'cancelled'], default: 'reserved' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Chống overbooking: cùng 1 xe + 1 ngày + trạng thái đang chiếm dụng thì chỉ được 1 bản ghi
VehicleAllocationSchema.index(
  { vehicle_id: 1, service_date: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['reserved', 'confirmed'] },
    },
  }
);

VehicleAllocationSchema.index({ booking_id: 1, day_no: 1 });
VehicleAllocationSchema.index({ trip_key: 1, day_no: 1 });

export default mongoose.model<IVehicleAllocation>('VehicleAllocation', VehicleAllocationSchema);
