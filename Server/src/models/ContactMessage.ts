import mongoose, { Schema, Document } from 'mongoose';

export interface IContactMessage extends Document {
  name: string;
  phone: string;
  content: string;
  status: 'unread' | 'read';
  created_at: Date;
  updated_at: Date;
}

const ContactMessageSchema: Schema = new Schema(
  {
    name: { type: String, required: [true, 'Vui lòng nhập họ và tên'] },
    phone: { type: String, required: [true, 'Vui lòng nhập số điện thoại'] },
    content: { type: String, required: [true, 'Vui lòng nhập nội dung câu hỏi'] },
    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
