import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface ITourTemplate extends Document {
  name: string;
  slug?: string;
  description?: string;
  category_id?: mongoose.Types.ObjectId;

  duration_days: number;

  schedule?: {
    day: number;
    title: string;
    activities: string[];
  }[];

  images?: string[];
  policies?: string[];
  suppliers?: string[];

  created_at: Date;
  updated_at: Date;
}

const TourTemplateSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Template phải có tên'],
      trim: true,
      unique: true,
    },
    slug: String,
    description: { type: String, default: '' },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category' },

    duration_days: { type: Number, required: true, min: 1 },

    schedule: [
      {
        day: Number,
        title: String,
        activities: [String],
      },
    ],

    images: [String],
    policies: [String],
    suppliers: [String],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TourTemplateSchema.pre('save', function () {
  if (!this.isModified('name')) return;
  this.slug = slugify(this.name as string, { lower: true });
});

export default mongoose.model<ITourTemplate>('TourTemplate', TourTemplateSchema);

