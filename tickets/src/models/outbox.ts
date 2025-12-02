import { model, Schema, Document, Model } from 'mongoose';

export interface OutboxAttrs {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
}

export interface OutboxDoc extends Document {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  createdAt: Date;
  availableAt: Date;
  processingAt: Date;
  publishedAt: Date;
  attempts: number;
  status: 'pending' | 'processing' | 'published' | 'failed';
}

interface OutboxModel extends Model<OutboxDoc> {
  build(attrs: OutboxAttrs): OutboxDoc;
}

const outboxSchema = new Schema(
  {
    aggregateType: { type: String, required: true },
    aggregateId: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Object, required: true },
    status: { type: String, required: true, default: 'pending' },
    availableAt: { type: Date, required: true, default: Date.now },
    processingAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    attempts: { type: Number, required: true, default: 0 }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

outboxSchema.statics.build = (attrs: OutboxAttrs) => {
  return new Outbox(attrs);
};

const Outbox = model('Outbox', outboxSchema) as unknown as OutboxModel;

export { Outbox };
