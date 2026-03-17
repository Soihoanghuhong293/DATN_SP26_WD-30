import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  tour_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  guide_id?: mongoose.Types.ObjectId;

  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  customer_note?: string;

  total_price: number;
  startDate: Date;
  endDate?: Date;
  groupSize: number;

  schedule_detail?: string;
  service_detail?: string;
  notes?: string;

  status: "pending" | "confirmed" | "paid" | "cancelled" | "deposit" | "refunded";

  tour_stage?: "scheduled" | "in_progress" | "completed";

  paymentMethod?: string;

  guests: Array<{
    full_name: string;
    gender: string;
    type: string;
    room?: string;
    note?: string;
  }>;

  logs: Array<{
    time: Date;
    user: string;
    old: string;
    new: string;
    note?: string;
  }>;

  created_at: Date;
  updated_at: Date;
}

// Schema
const BookingSchema: Schema = new Schema(
  {
    tour_id: {
      type: Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Booking phải có thông tin Tour!"],
    },

    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    guide_id: { type: Schema.Types.ObjectId, ref: "User" },

    customer_name: {
      type: String,
      required: [true, "Phải có tên khách hàng!"],
    },

    customer_phone: {
      type: String,
      required: [true, "Phải có SĐT khách hàng!"],
    },

    customer_email: { type: String },
    customer_address: { type: String },
    customer_note: { type: String, default: "" },

    total_price: {
      type: Number,
      required: [true, "Booking phải có tổng tiền!"],
    },

    startDate: {
      type: Date,
      required: [true, "Booking phải có ngày khởi hành!"],
    },

    endDate: { type: Date },

    groupSize: {
      type: Number,
      required: true,
      default: 1,
    },

    schedule_detail: { type: String },
    service_detail: { type: String },
    notes: { type: String },

    status: {
      type: String,
      enum: ["pending", "confirmed", "paid", "cancelled","refunded","deposit"],
      default: "confirmed",
    },

    tour_stage: {
      type: String,
      enum: ["scheduled", "in_progress", "completed"],
      default: "scheduled",
    },

    guests: [
      {
        full_name: String,
        gender: String,
        type: String,
        room: String,
        note: String,
      },
    ],

    logs: [
      {
        time: { type: Date, default: Date.now },
        user: String,
        old: String,
        new: String,
        note: String,
      },
    ],

    paymentMethod: {
      type: String,
      default: "offline",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
  }
);

export default mongoose.model<IBooking>("Booking", BookingSchema);