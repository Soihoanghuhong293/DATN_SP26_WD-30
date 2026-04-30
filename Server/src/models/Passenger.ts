import mongoose, { Schema, Document } from 'mongoose';

export interface IPassenger extends Document {
  booking_id: mongoose.Types.ObjectId;
  tour_id: mongoose.Types.ObjectId;
  trip_key: string; // `${tourId}:${YYYY-MM-DD}`
  trip_date: string; // YYYY-MM-DD

  role: 'leader' | 'passenger';
  is_leader?: boolean;
  source_guest_id?: string; // subdocument _id (nếu có)

  full_name: string;
  gender?: string;
  birth_date?: Date;
  phone?: string;
  type?: string;

  created_at: Date;
  updated_at: Date;
}

const PassengerSchema: Schema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    trip_key: { type: String, required: true, trim: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true },

    role: { type: String, enum: ['leader', 'passenger'], default: 'passenger', index: true },
    is_leader: { type: Boolean, default: false, index: true },
    source_guest_id: { type: String, trim: true },

    full_name: { type: String, required: true, trim: true },
    gender: { type: String, trim: true },
    birth_date: { type: Date },
    phone: { type: String, trim: true },
    type: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

PassengerSchema.index(
  { booking_id: 1, is_leader: 1 },
  { unique: true, partialFilterExpression: { is_leader: true } }
);
PassengerSchema.index(
  { booking_id: 1, source_guest_id: 1 },
  { unique: true, partialFilterExpression: { source_guest_id: { $type: 'string' } } }
);

export default mongoose.model<IPassenger>('Passenger', PassengerSchema);

