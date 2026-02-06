import mongoose, { Schema, Document } from 'mongoose';

export type TourStatus = 'draft' | 'active' | 'inactive';

export interface ITour extends Document {
  // PK (Mongo uses _id, we also expose virtual id)
  id: string;

  // Required by user
  category_id?: mongoose.Types.ObjectId;
  description: string;
  schedule: {
    day: number;
    title: string;
    activities: string[];
  }[];
  images: string[];
  prices: {
    title: string;
    amount: number;
    note?: string;
  }[];
  policies: string[];
  suppliers: string[];
  price: number;
  status: TourStatus;
  created_at: Date;
  update_at: Date;
  duration_: number;

  // Backward-compatible fields (already used in repo)
  name?: string;
  slug?: string;
}

const TourSchema: Schema = new Schema(
  {
    // Keep name optional for backward compatibility; UI will primarily use description
    name: { type: String, trim: true },

    description: { type: String, required: true },

    // Map FK category_id
    category_id: { type: Schema.Types.ObjectId, ref: 'Category' },

    duration_: { type: Number, required: true, min: 1 },

    images: { type: [String], default: [] },

    schedule: [
      {
        day: { type: Number, min: 1 },
        title: { type: String, default: '' },
        activities: { type: [String], default: [] },
      },
    ],

    // Base price required
    price: { type: Number, required: true, min: 0 },

    // Optional tiered prices
    prices: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        note: { type: String },
      },
    ],

    policies: { type: [String], default: [] },
    suppliers: { type: [String], default: [] },

    status: {
      type: String,
      enum: ['draft', 'active', 'inactive'],
      default: 'draft',
      index: true,
    },

    // Keep slug optional if you later want SEO urls
    slug: { type: String, unique: true, sparse: true },

    // Deprecated fields kept to avoid breaking existing data
    category: { type: Schema.Types.ObjectId, ref: 'Category', select: false },
    basePrice: { type: Number, select: false },
    duration: { type: Number, select: false },
    startDates: { type: [Date], select: false },
    maxGroupSize: { type: Number, select: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'update_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Expose "id" like SQL PK id
TourSchema.virtual('id').get(function (this: { _id: mongoose.Types.ObjectId }) {
  return this._id.toHexString();
});

// Index for common filtering
TourSchema.index({ status: 1, category_id: 1, price: 1, duration_: 1 });

export default mongoose.model<ITour>('Tour', TourSchema);