import { Producer } from 'kafkajs';

export class DLQPublisher {
  constructor(
    private readonly topic: string,
    private readonly producer: Producer,
  ) {}

  async publish(data: any) {
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          value: Buffer.from(JSON.stringify(data)),
        },
      ],
    });
  }
}
