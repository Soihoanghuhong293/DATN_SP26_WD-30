import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify'; 
import type { CallbackWithoutResultAndOptionalError } from "mongoose";


export interface ITour extends Document {
  name: string;
  slug?: string;
  description: string;
  category_id: mongoose.Types.ObjectId; 
  
  schedule: {
    day: number;
    title: string;
    activities: string[];
  }[];
  
  images: string[];
  
  prices: {
    name: string;
    price: number;
  }[];

  pesolici: string[];
  suppliers: string[];
  
  price: number; 
  status: 'active' | 'draft' | 'hidden';
  duration_days: number; 
  
  created_at: Date;
  updated_at: Date;

  seasonalPrices?: {
    title: string;
    startDate: Date;
    endDate: Date;
    prices: { name: string; price: number }[]; 
  }[];

  template_id?: mongoose.Types.ObjectId;
}


const TourSchema: Schema = new Schema({
  // qly lihcj khởi hành
departure_schedule: [{
  date: { type: String }, 
  slots: { type: Number, min: 1 }
}],

  seasonalPrices: [{
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    
   //giá chi tiết
    prices: [{
      name: String, 
      price: Number  
    }]
  }],
  name: { 
    type: String, 
    required: [true, 'Tour phải có tên'], 
    trim: true 
  },
  slug: String,
  description: { type: String, required: true },
  
  category_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category',
    required: true
  },

  schedule: [{
    day: Number,
    title: String,
    activities: [String]
  }],

  images: [String],

  prices: [{
    name: String,
    price: Number
  }],

  policies: [String],
  suppliers: [String],

  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['active', 'draft', 'hidden'],
    default: 'draft'
  },
  
  duration_days: { type: Number, required: true }

  ,
  template_id: { type: Schema.Types.ObjectId, ref: 'TourTemplate' }

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

TourSchema.pre('save', async function () {
  if (!this.isModified('name')) return;

  const baseSlug = slugify(this.name as string, { lower: true, strict: true });
  let nextSlug = baseSlug;
  let counter = 2;

  // đảm bảo slug không trùng (đặc biệt khi tạo tour từ template)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existed = await (this.constructor as any).findOne({
      slug: nextSlug,
      _id: { $ne: this._id },
    });
    if (!existed) break;
    nextSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  this.slug = nextSlug;
});

export default mongoose.model<ITour>('Tour', TourSchema);