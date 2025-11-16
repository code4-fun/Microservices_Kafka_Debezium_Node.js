import { Publisher, TicketCreatedEvent, Topics } from '@aitickets123654/common-kafka';
import { kafkaClient } from '../../kafka-client';

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  topic: Topics.TicketCreated = Topics.TicketCreated;

  constructor() {
    super(kafkaClient.producer);
  }
}
