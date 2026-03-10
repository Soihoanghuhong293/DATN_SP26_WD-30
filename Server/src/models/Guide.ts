import mongoose, { Schema, Document } from 'mongoose';

export type GuideGroupType = 'domestic' | 'international' | 'specialized_line' | 'group_specialist';
export type HealthStatus = 'healthy' | 'sick' | 'on_leave' | 'retired';

export interface IGuide extends Document {
  id: string;
  user_id: mongoose.Types.ObjectId; // 👈 BẮT BUỘC CÓ ĐỂ NỐI VỚI USER
  name: string;
  birtdate?: Date; // 👈 Cho phép rỗng lúc mới tạo
  avatar?: string;
  phone?: string; // 👈 Cho phép rỗng
  email?: string;
  // ... các trường khác giữ nguyên
  certificate: {
    name: string;
    issueDate: Date;
    expiryDate?: Date;
    documentUrl?: string;
  }[];
  languages: string[];
  experience: {
    years: number;
    specialization?: string;
    description?: string;
  };
  history: {
    tourId: mongoose.Types.ObjectId;
    tourName: string;
    startDate: Date;
    endDate: Date;
    groupSize?: number;
  }[];
  rating: {
    average: number;
    totalReviews: number;
    reviews: {
      score: number;
      comment?: string;
      date: Date;
      reviewedBy?: string;
    }[];
  };
  group_type: GuideGroupType;
  health_status: HealthStatus;
  address?: string;
  identityCard?: string;
  created_at: Date;
  update_at: Date;
}

const GuideSchema: Schema = new Schema(
  {
    // FK to User: QUAN HỆ 1-1 CHẶT CHẼ
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    name: { type: String, required: true, trim: true },
    birtdate: { type: Date }, // Bỏ required
    avatar: { type: String, default: null },
    
    // sparse: true giúp cho phép nhiều người cùng chưa cập nhật số điện thoại (bỏ qua lỗi duplicate null)
    phone: { type: String, unique: true, sparse: true }, 
    email: { type: String, trim: true },
    address: { type: String },
    identityCard: { type: String, unique: true, sparse: true },

    certificate: [
      {
        name: { type: String, required: true },
        issueDate: { type: Date, required: true },
        expiryDate: { type: Date },
        documentUrl: { type: String },
      },
    ],

    languages: {
      type: [String],
      default: ['Vietnamese'],
      enum: ['Vietnamese', 'English', 'French', 'Chinese', 'Japanese', 'Korean', 'German', 'Spanish', 'Russian', 'Italian', 'Thai'],
    },

    experience: {
      years: { type: Number, default: 0, min: 0 }, // Sửa thành default: 0 thay vì bắt buộc
      specialization: { type: String },
      description: { type: String },
    },

    history: [
      {
        tourId: { type: Schema.Types.ObjectId, ref: 'Tour' },
        tourName: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        groupSize: { type: Number },
      },
    ],

    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0 },
      reviews: [
        {
          score: { type: Number, required: true, min: 1, max: 5 },
          comment: { type: String },
          date: { type: Date, default: Date.now },
          reviewedBy: { type: String },
        },
      ],
    },

    group_type: {
      type: String,
      enum: ['domestic', 'international', 'specialized_line', 'group_specialist'],
      default: 'domestic',
      required: true,
    },

    health_status: {
      type: String,
      enum: ['healthy', 'sick', 'on_leave', 'retired'],
      default: 'healthy',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'update_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

GuideSchema.virtual('id').get(function (this: { _id: mongoose.Types.ObjectId }) {
  return this._id.toHexString();
});

export default mongoose.model<IGuide>('Guide', GuideSchema);