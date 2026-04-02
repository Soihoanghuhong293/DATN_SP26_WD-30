import mongoose, { Schema, Document } from 'mongoose';

export type TicketApplicationMode = 'included_in_tour' | 'optional_addon';
export type TicketStatus = 'active' | 'inactive';

export interface IProviderTicket extends Document {
  name: string;
  ticket_type: string;
  price_adult: number;
  price_child: number;
  application_mode: TicketApplicationMode;
  provider_id: mongoose.Types.ObjectId;
  status: TicketStatus;
  created_at: Date;
  updated_at: Date;
}

const ProviderTicketSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ticket_type: { type: String, required: true, trim: true },
    price_adult: { type: Number, required: true, min: 0, default: 0 },
    price_child: { type: Number, required: true, min: 0, default: 0 },
    application_mode: {
      type: String,
      enum: ['included_in_tour', 'optional_addon'],
      required: true,
      default: 'optional_addon',
    },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model<IProviderTicket>('ProviderTicket', ProviderTicketSchema);
