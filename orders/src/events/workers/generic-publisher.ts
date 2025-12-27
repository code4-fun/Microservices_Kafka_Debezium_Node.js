import { Publisher, Topics } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

interface Event<T> {
  topic: Topics;
  data: T;
}

export class GenericPublisher<T> extends Publisher<Event<T>> {
  topic: Topics;

  constructor(topic: Topics) {
    super(kafkaClient.producer);
    this.topic = topic;
  }
}
