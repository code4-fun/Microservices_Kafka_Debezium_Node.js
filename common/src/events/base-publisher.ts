import { Producer, IHeaders } from 'kafkajs';
import { Topics } from './topics';
import { registry } from './config/registry';
import schemaIds from './config/schema-ids.json';

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

  async publish(data: T['data'], headers?: IHeaders): Promise<void> {
    try {
      const schemaId = schemaIds[`${this.topic}-value`];
      const encoded = await registry.encode(schemaId, data);

      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            value: encoded,
            headers,
          }
        ],
      });

      console.log(`Event published to topic '${this.topic}'`);
    } catch (err) {
      console.error('Failed to publish event:', err);
      throw err;
    }
  }
}
