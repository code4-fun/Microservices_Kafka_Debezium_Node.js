import { Publisher, Topics } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

interface DLQEvent<T> {
  topic: Topics;
  data: T;
}

export class DLQPublisher<T> extends Publisher<DLQEvent<T>> {
  topic: Topics;

  constructor(topic: Topics) {
    super(kafkaClient.producer);
    this.topic = topic;
  }
}
