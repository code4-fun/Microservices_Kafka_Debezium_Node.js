import { Publisher, Topics, OrderCancelledEvent } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
  topic: Topics.OrderCancelled = Topics.OrderCancelled;

  constructor() {
    super(kafkaClient.producer);
  }
}
