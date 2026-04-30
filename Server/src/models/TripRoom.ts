import mongoose, { Schema, Document } from 'mongoose';

export interface ITripRoom extends Document {
  tour_id: mongoose.Types.ObjectId;
  trip_key: string; // `${tourId}:${YYYY-MM-DD}`
  trip_date: string; // YYYY-MM-DD

  room_id: mongoose.Types.ObjectId; // Provider room
  hotel_id?: mongoose.Types.ObjectId;
  hotel_name?: string; // snapshot
  room_number: string; // snapshot
  capacity: number; // <= room.max_occupancy

  created_at: Date;
  updated_at: Date;
}

const TripRoomSchema: Schema = new Schema(
  {
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_key: { type: String, required: true, trim: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true },

    room_id: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', index: true },
    hotel_name: { type: String, trim: true },
    room_number: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// 1 trip không add trùng 1 phòng nguồn
TripRoomSchema.index({ trip_key: 1, room_id: 1 }, { unique: true });

export default mongoose.model<ITripRoom>('TripRoom', TripRoomSchema);

