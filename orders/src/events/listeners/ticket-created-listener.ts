import { Topics, TicketCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { ticketCreatedGroupId } from './group-id';
import { createTicket } from '../../services/tickets.service';

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  topic: Topics.TicketCreated = Topics.TicketCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(ticketCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: TicketCreatedEvent['data'], payload: EachMessagePayload) {
    const { id, title, price, version } = data;
    console.log(`TicketCreatedEvent received id=${id}, v=${version}`);
    await createTicket({ id, title, price, version });
  }
}
