import { Publisher, TicketUpdatedEvent, Topics } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
  topic: Topics.TicketUpdated = Topics.TicketUpdated;

  constructor() {
    super(kafkaClient.producer);
  }
}

