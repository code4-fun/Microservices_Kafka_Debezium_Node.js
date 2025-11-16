import { Topics, Publisher, PaymentCreatedEvent } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
  topic: Topics.PaymentCreated = Topics.PaymentCreated;

  constructor() {
    super(kafkaClient.producer);
  }
}
