import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin" | "guide";
  status: "active" | "inactive";
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true }, 
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin", "guide"], default: "user" },
  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

export default model<IUser>("User", userSchema);