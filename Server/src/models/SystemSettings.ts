import { Schema, model, type Document } from "mongoose";

export interface ISystemSettings extends Document {
  siteName: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    siteName: { type: String, required: true, default: "ViGo" },
    logoUrl: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
  },
  { timestamps: true }
);

export default model<ISystemSettings>("SystemSettings", systemSettingsSchema);

