import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string;
  role: "user" | "admin";
  status: "active" | "inactive"; // Thêm trường này để khóa/mở khóa
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  status: { type: String, enum: ["active", "inactive"], default: "active" } // Mặc định là active
}, { timestamps: true });

export default model<IUser>("User", userSchema);