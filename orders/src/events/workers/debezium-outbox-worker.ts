import { OutboxEventMap } from './outbox-event-map';
import { DebeziumRawListener } from './debezium-raw-listener';

export class DebeziumOutboxWorker {
  private listeners: DebeziumRawListener[] = [];

  constructor() {
    for (const { rawTopic, targetTopic } of OutboxEventMap) {
      this.listeners.push(
        new DebeziumRawListener(rawTopic, targetTopic),
      );
    }
  }

  async start() {
    for (const listener of this.listeners) {
      await listener.listen();
    }

    console.log(
      `[DebeziumOutboxWorker] started for topics:`,
      this.listeners.map((l) => l.topic),
    );
  }
}
