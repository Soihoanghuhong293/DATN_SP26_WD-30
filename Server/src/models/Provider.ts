import mongoose, { Schema, Document } from 'mongoose';

export type ProviderStatus = 'active' | 'inactive';

export interface IProvider extends Document {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  contract_info?: string;
  preferred_pricing?: string;
  status: ProviderStatus;
  created_at: Date;
  update_at: Date;
}

const ProviderSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    emergency_contact: { type: String, default: '', trim: true },
    contract_info: { type: String, default: '', trim: true },
    preferred_pricing: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'update_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProviderSchema.virtual('id').get(function (this: { _id: mongoose.Types.ObjectId }) {
  return this._id.toHexString();
});

export default mongoose.model<IProvider>('Provider', ProviderSchema);
