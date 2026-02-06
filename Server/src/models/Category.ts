import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  id: string;
  name: string;
  created_at: Date;
  update_at: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
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


