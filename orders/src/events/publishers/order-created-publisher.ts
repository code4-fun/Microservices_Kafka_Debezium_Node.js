import { Publisher, Topics, OrderCreatedEvent } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  topic: Topics.OrderCreated = Topics.OrderCreated;

  constructor() {
    super(kafkaClient.producer);
  }
}
