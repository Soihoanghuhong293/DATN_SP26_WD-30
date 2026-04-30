import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomingAllocation extends Document {
  tour_id: mongoose.Types.ObjectId;
  trip_key: string;
  trip_date: string; // YYYY-MM-DD

  trip_room_id: mongoose.Types.ObjectId;
  passenger_id: mongoose.Types.ObjectId;

  created_at: Date;
  updated_at: Date;
}

const RoomingAllocationSchema: Schema = new Schema(
  {
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_key: { type: String, required: true, trim: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true },

    trip_room_id: { type: Schema.Types.ObjectId, ref: 'TripRoom', required: true, index: true },
    passenger_id: { type: Schema.Types.ObjectId, ref: 'Passenger', required: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// 1 passenger trong 1 trip chỉ ở 1 phòng (chặng 2 demo: 1 đêm)
RoomingAllocationSchema.index({ trip_key: 1, passenger_id: 1 }, { unique: true });
// tránh insert trùng quan hệ
RoomingAllocationSchema.index({ trip_room_id: 1, passenger_id: 1 }, { unique: true });

export default mongoose.model<IRoomingAllocation>('RoomingAllocation', RoomingAllocationSchema);

