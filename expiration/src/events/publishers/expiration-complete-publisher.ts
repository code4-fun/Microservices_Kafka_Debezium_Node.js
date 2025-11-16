import { Publisher, Topics, ExpirationCompleteEvent } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  topic: Topics.ExpirationComplete = Topics.ExpirationComplete;

  constructor() {
    super(kafkaClient.producer);
  }
}
