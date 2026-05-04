import mongoose, { Schema, Document } from "mongoose";

export type GuideLeaveRequestStatus = "pending" | "approved" | "rejected";

export interface IGuideLeaveRequest extends Document {
  requester_user_id: mongoose.Types.ObjectId;
  tour_id: mongoose.Types.ObjectId;
  /** YYYY-MM-DD — cùng chuẩn với client trip */
  trip_date: string;
  reason: string;
  proposed_replacement_user_id?: mongoose.Types.ObjectId;
  status: GuideLeaveRequestStatus;
  resolved_replacement_user_id?: mongoose.Types.ObjectId;
  admin_note?: string;
  rejection_note?: string;
  processed_at?: Date;
  processed_by_user_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const GuideLeaveRequestSchema = new Schema(
  {
    requester_user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tour_id: { type: Schema.Types.ObjectId, ref: "Tour", required: true, index: true },
    trip_date: { type: String, required: true, trim: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    proposed_replacement_user_id: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    resolved_replacement_user_id: { type: Schema.Types.ObjectId, ref: "User" },
    admin_note: { type: String, trim: true, maxlength: 1000 },
    rejection_note: { type: String, trim: true, maxlength: 1000 },
    processed_at: { type: Date },
    processed_by_user_id: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

GuideLeaveRequestSchema.index({ tour_id: 1, trip_date: 1, requester_user_id: 1, status: 1 });

export default mongoose.model<IGuideLeaveRequest>("GuideLeaveRequest", GuideLeaveRequestSchema);
