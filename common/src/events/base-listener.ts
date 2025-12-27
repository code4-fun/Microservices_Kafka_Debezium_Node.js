import { Consumer, EachMessagePayload } from 'kafkajs';
import { Topics } from './topics';
import { registry } from './config/registry';

interface Event {
  topic: Topics;
  data: any;
}

export abstract class Listener<T extends Event> {
  abstract topic: T['topic'];
  abstract onMessage(data: T['data'], payload: EachMessagePayload): void;
  protected consumer!: Consumer;

  constructor(consumer: Consumer) {
    this.consumer = consumer;
  }

  protected async decode(value: Buffer): Promise<any> {
    return registry.decode(value);
  }

  async listen() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.topic,
      fromBeginning: true,
    });
    console.log(`Listener connected to Kafka (topic: ${this.topic})`);

    await this.consumer.run({
      eachBatchAutoResolve: false,
      eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        commitOffsetsIfNecessary,
        uncommittedOffsets,
      }) => {
        const { topic, partition } = batch;
        let lastProcessedOffset: string | null = null;

        try {
          for (const message of batch.messages) {
            const { offset, value } = message;

            if (!value) {
              resolveOffset(offset);
              lastProcessedOffset = offset;
              continue;
            }

            let data;
            try {
              data = await this.decode(value);
            } catch (err) {
              console.error(`Avro decode failed for ${topic}/${partition}@${offset}`, err);
              resolveOffset(offset);
              lastProcessedOffset = offset;
              continue;
            }

            try {
              await this.onMessage(data, { topic, partition, message } as any);
              resolveOffset(offset);
              lastProcessedOffset = offset;
              await heartbeat();
            } catch (err) {
              console.warn(`Error processing ${topic}/${partition}@${offset}:`, err);
              this.consumer.seek({ topic, partition, offset });
              await new Promise((r) => setTimeout(r, 50));
              break;
            }
          }
        } finally {
          try {
            if (lastProcessedOffset !== null) {
              await commitOffsetsIfNecessary();
            }
          } catch (commitErr) {
            console.error(`commitOffsetsIfNecessary failed (${topic}/${partition})`, commitErr);
          }
        }
      },
    });
  }
}
