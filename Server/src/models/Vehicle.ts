import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Document {
  plate: string;
  capacity: number;
  status: 'active' | 'inactive';
  provider_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const VehicleSchema: Schema = new Schema(
  {
    plate: { type: String, required: true, trim: true, unique: true },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model<IVehicle>('Vehicle', VehicleSchema);
