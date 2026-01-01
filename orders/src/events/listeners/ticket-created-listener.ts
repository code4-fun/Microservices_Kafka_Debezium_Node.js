import { Topics, TicketCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { ticketCreatedGroupId } from './group-id';
import { createTicketFromEvent } from '../../services/tickets.service';

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  topic: Topics.TicketCreated = Topics.TicketCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(ticketCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: TicketCreatedEvent['data'], payload: EachMessagePayload) {
    const { id, title, price, version } = data;
    console.log(`TicketCreatedEvent received id=${id}, v=${version}`);

    const eventId = payload.message.headers?.eventId?.toString();
    if (!eventId) {
      throw new Error('eventId is required for idempotent processing');
    }

    try {
      await createTicketFromEvent(eventId, { id, title, price, version });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // P2002 — Unique constraint failed -> событие уже обработано
        return;
      }
      throw err;
    }
  }
}
