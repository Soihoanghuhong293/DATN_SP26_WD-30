import mongoose, { Schema, Document } from 'mongoose';

export type CategoryStatus = 'active' | 'inactive';

export interface ICategory extends Document {
  id: string;
  name: string;
  description?: string;
  parent_id?: mongoose.Types.ObjectId | null;
  status: CategoryStatus;
  created_at: Date;
  update_at: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '', trim: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'update_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CategorySchema.virtual('id').get(function (this: { _id: mongoose.Types.ObjectId }) {
  return this._id.toHexString();
});

export default mongoose.model<ICategory>('Category', CategorySchema);


