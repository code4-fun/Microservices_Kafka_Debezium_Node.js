import { Topics, RawTopics, RawListener, DLQPublisher } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';
import { EachMessagePayload } from 'kafkajs';
import { GenericPublisher } from './generic-publisher';

const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS || 8);
const BACKOFF_BASE_MS = Number(process.env.OUTBOX_BACKOFF_BASE_MS || 200);

function computeBackoff(attempt: number) {
  const next = Math.min(attempt, 20);
  return Math.pow(2, next) * BACKOFF_BASE_MS;
}

export class DebeziumRawListener extends RawListener<any> {
  topic: RawTopics;

  constructor(
    rawTopic: RawTopics,
    private readonly targetTopic: Topics,
  ) {
    super(kafkaClient.createConsumer(`debezium-${rawTopic}`));
    this.topic = rawTopic;
  }

  async onMessage(data: any, payload: EachMessagePayload) {
    const { message } = payload;
    const headers = message.headers || {};
    const attempts = Number(headers.attempts?.toString() || '0');

    const parsed = JSON.parse(data);
    const publisher = new GenericPublisher(this.targetTopic);

    try {
      // throw new Error('test DLQ');
      await publisher.publish(parsed);
    } catch (err) {
      // data-poison → DLQ right away
      if (this.isSerializationError(err)) {
        await this.publishToDLQ(parsed, err, attempts);
        return;
      }

      const nextAttempts = attempts + 1;

      if (nextAttempts >= MAX_ATTEMPTS) {
        await this.publishToDLQ(parsed, err, nextAttempts);
        return;
      }

      await new Promise((r) =>
        setTimeout(r, computeBackoff(nextAttempts)),
      );

      await publisher.publish(parsed, {
        ...headers,
        attempts: Buffer.from(String(nextAttempts)),
      });
    }
  }

  isSerializationError(err: any): boolean {
    return (
      err?.name === 'ConfluentSchemaRegistryValidationError' ||
      err?.message?.includes('schema') ||
      err?.message?.includes('registry') ||
      err?.message?.includes('Avro')
    );
  }

  private async publishToDLQ(
    data: any,
    err: any,
    attempts: number,
  ) {
    const dlqTopic = `${this.targetTopic}.DLQ` as Topics;
    const dlqPublisher = new DLQPublisher(dlqTopic, kafkaClient.producer);

    await dlqPublisher.publish({
      payload: data,
      error: String(err?.message || err),
      attempts,
      failedAt: new Date().toISOString(),
    });
  }
}
