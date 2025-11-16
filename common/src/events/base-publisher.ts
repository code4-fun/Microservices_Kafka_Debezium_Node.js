import { Producer } from 'kafkajs';
import { Topics } from './topics';

interface Event {
  topic: Topics;
  data: any;
}

export abstract class Publisher<T extends Event> {
  abstract topic: T['topic'];
  protected producer: Producer;

  protected constructor(producer: Producer) {
    this.producer = producer;
  }

  async publish(data: T['data']): Promise<void> {
    try {
      await this.producer.send({
        topic: this.topic,
        messages: [{ value: JSON.stringify(data) }],
      });
    } catch (err) {
      console.error('Failed to publish event:', err);
      throw err;
    }
  }
}
