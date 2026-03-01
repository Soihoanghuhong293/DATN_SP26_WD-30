import { Schema, model } from "mongoose";

export interface IUser {
  email: string;
  password: string;
  role: "user" | "admin";
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" }
});

export default model<IUser>("User", userSchema);