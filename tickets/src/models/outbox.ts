import { model, Schema, Document, Model } from 'mongoose';
import { EventMap } from '@aitickets123654/common-kafka';

export interface OutboxAttrs<T extends keyof EventMap> {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: T;
  payload: EventMap[T]['data'];
}

export interface OutboxDoc<T extends keyof EventMap> extends Document {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: T;
  payload: EventMap[T]['data'];
  createdAt: Date;
  availableAt: Date;
  processingAt: Date;
  publishedAt: Date;
  attempts: number;
  status: 'pending' | 'processing' | 'published' | 'failed';
}

interface OutboxModel extends Model<OutboxDoc<keyof EventMap>> {
  build<T extends keyof EventMap>(attrs: OutboxAttrs<T>): OutboxDoc<T>;
}

const outboxSchema = new Schema(
  {
    eventId: { type: String, required: true },
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

outboxSchema.statics.build = function <T extends keyof EventMap>(
  attrs: OutboxAttrs<T>
): OutboxDoc<T> {
  return new Outbox(attrs) as unknown as OutboxDoc<T>;
};

const Outbox = model('Outbox', outboxSchema) as unknown as OutboxModel;

export { Outbox };
