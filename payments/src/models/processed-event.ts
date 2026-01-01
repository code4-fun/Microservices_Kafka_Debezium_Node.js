import mongoose from 'mongoose';

interface ProcessedEventAttrs {
  eventId: string;
  topic: string;
}

interface ProcessedEventDoc extends mongoose.Document {
  eventId: string;
  topic: string;
}

interface ProcessedEventModel extends mongoose.Model<ProcessedEventDoc> {
  build(attrs: ProcessedEventAttrs): ProcessedEventDoc;
}

const processedEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true, // idempotency
    },
    topic: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

processedEventSchema.statics.build = (attrs: ProcessedEventAttrs) => {
  return new ProcessedEvent(attrs);
};

const ProcessedEvent = mongoose.model(
  'ProcessedEvent',
  processedEventSchema
) as unknown as ProcessedEventModel;

export { ProcessedEvent };
export type { ProcessedEventDoc };
