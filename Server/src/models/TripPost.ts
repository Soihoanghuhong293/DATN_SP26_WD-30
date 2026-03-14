import { Schema, model, Document } from 'mongoose';

export interface ITripPost extends Document {
  booking_id: Schema.Types.ObjectId;
  title: string;
  content: string;
  images: string[];
  author_id: Schema.Types.ObjectId;
  status: 'public' | 'private' | 'draft';
  created_at: Date;
  updated_at: Date;
}

const TripPostSchema: Schema = new Schema({
  booking_id: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Bài viết phải liên kết với booking!']
  },
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc!'],
    maxlength: 200
  },
  content: {
    type: String,
    required: [true, 'Nội dung là bắt buộc!']
  },
  images: [{ type: String }],
  author_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tác giả là bắt buộc!']
  },
  status: {
    type: String,
    enum: ['public', 'private', 'draft'],
    default: 'draft',
    required: true
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default model<ITripPost>('TripPost', TripPostSchema);