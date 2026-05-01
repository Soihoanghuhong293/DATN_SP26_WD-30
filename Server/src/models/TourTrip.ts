import mongoose, { Schema, Document } from 'mongoose';

export type TripStatus = 'DRAFT' | 'OPENING' | 'CLOSED' | 'COMPLETED';

export interface ITourTrip extends Document {
  tour_id: mongoose.Types.ObjectId;
  trip_key: string; // `${tourId}:${YYYY-MM-DD}`
  trip_date: string; // YYYY-MM-DD
  status: TripStatus;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

const TourTripSchema: Schema = new Schema(
  {
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_key: { type: String, required: true, trim: true, unique: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true }, // YYYY-MM-DD

    status: {
      type: String,
      enum: ['DRAFT', 'OPENING', 'CLOSED', 'COMPLETED'],
      default: 'DRAFT',
      index: true,
    },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TourTripSchema.index({ tour_id: 1, trip_date: 1 }, { unique: true });

export default mongoose.model<ITourTrip>('TourTrip', TourTripSchema);

