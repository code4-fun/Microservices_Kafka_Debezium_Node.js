import { Topics, TicketUpdatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { ticketUpdatedGroupId } from './group-id';
import { updateTicketFromEvent } from '../../services/tickets.service';

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  topic: Topics.TicketUpdated = Topics.TicketUpdated;

  constructor() {
    const consumer = kafkaClient.createConsumer(ticketUpdatedGroupId);
    super(consumer);
  }

  async onMessage(data: TicketUpdatedEvent['data'], payload: EachMessagePayload) {
    const { id, title, price, version } = data;
    console.log(`TicketUpdatedEvent received id=${id}, v=${version}`);

    const eventId = payload.message.headers?.eventId?.toString();
    if (!eventId) {
      throw new Error('eventId is required for idempotent processing');
    }

    try {
      await updateTicketFromEvent(eventId, {
        id,
        version,
        data: { title, price },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // P2002 — Unique constraint failed -> событие уже обработано
        return;
      }
      throw err;
    }
  }
}
