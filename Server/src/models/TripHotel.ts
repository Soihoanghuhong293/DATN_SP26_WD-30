import mongoose, { Schema, Document } from 'mongoose';

export interface ITripHotel extends Document {
  tour_id: mongoose.Types.ObjectId;
  trip_key: string; // `${tourId}:${YYYY-MM-DD}`
  trip_date: string; // YYYY-MM-DD

  hotel_id: mongoose.Types.ObjectId;
  hotel_name?: string; // snapshot

  created_at: Date;
  updated_at: Date;
}

const TripHotelSchema: Schema = new Schema(
  {
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_key: { type: String, required: true, trim: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true },

    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotel_name: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TripHotelSchema.index({ trip_key: 1, hotel_id: 1 }, { unique: true });

export default mongoose.model<ITripHotel>('TripHotel', TripHotelSchema);

