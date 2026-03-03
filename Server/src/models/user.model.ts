import { Schema, model } from "mongoose";

export interface IUser {
  email: string;
  password: string;
  role: "user" | "admin";

  // ===== THÊM =====
  name?: string;
  type?: "customer" | "guide" | "admin";
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    // ===== GIỮ NGUYÊN =====
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },

    // ===== THÊM (KHÔNG ẢNH HƯỞNG CŨ) =====
    name: { type: String },

    // phân loại tài khoản cho admin quản lý
    type: {
      type: String,
      enum: ["customer", "guide", "admin"],
      default: "customer",
    },

    // khóa / mở tài khoản
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // tự thêm createdAt, updatedAt
  }
);

export default model<IUser>("User", userSchema);