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

  status: "pending" | "confirmed" | "cancelled";
  payment_status?: "unpaid" | "deposit" | "paid" | "refunded";

  tour_stage?: "scheduled" | "in_progress" | "completed";

  paymentMethod?: string;

  // reporting / payment breakdown
  deposit_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;

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

  diary_entries?: Array<{
    date: Date;
    day_no?: number;
    title?: string;
    content?: string;
    highlight?: string;
    images?: Array<{ name?: string; url: string }>;
    created_by?: string;
    created_at?: Date;
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
      enum: ["pending", "confirmed", "cancelled"],
      default: "confirmed",
    },

    payment_status: {
      type: String,
      enum: ["unpaid", "deposit", "paid", "refunded"],
      default: "unpaid",
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

    diary_entries: [
      {
        date: { type: Date, required: true },
        day_no: { type: Number, default: 1 },
        title: { type: String, default: "" },
        content: { type: String, default: "" },
        highlight: { type: String, default: "" },
        images: [
          {
            name: { type: String, default: "" },
            url: { type: String, required: true },
          },
        ],
        created_by: { type: String, default: "" },
        created_at: { type: Date, default: Date.now },
      },
    ],

    paymentMethod: {
      type: String,
      default: "offline",
    },

    deposit_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    remaining_amount: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
  }
);

// validate chuyển trạng thái
const validTransitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

BookingSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() as any;

  const newStatus = update.$set?.status || update.status;

  if (newStatus) {
    const docToUpdate = await this.model.findOne(this.getQuery());

    if (docToUpdate) {
      const oldStatus = docToUpdate.status;

      if (oldStatus && oldStatus !== newStatus) {
        const allowed = validTransitions[oldStatus] || [];

        if (!allowed.includes(newStatus)) {
          throw new Error(
            `Không thể đổi trạng thái từ '${oldStatus}' sang '${newStatus}'`
          );
        }
      }
    }
  }
});

export default mongoose.model<IBooking>("Booking", BookingSchema);