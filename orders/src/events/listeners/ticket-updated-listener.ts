import { Topics, TicketUpdatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { ticketUpdatedGroupId } from './group-id';
import { updateTicketByVersion } from '../../services/tickets.service';

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  topic: Topics.TicketUpdated = Topics.TicketUpdated;

  constructor() {
    const consumer = kafkaClient.createConsumer(ticketUpdatedGroupId);
    super(consumer);
  }

  async onMessage(data: TicketUpdatedEvent['data'], payload: EachMessagePayload) {
    const { id, title, price, version } = data;
    console.log(`TicketUpdatedEvent received id=${id}, v=${version}`);

    const updated = await updateTicketByVersion({
      id,
      version,
      data: { title, price }
    });

    if (!updated) {
      throw new Error(`[orders] out-of-order update, id=${id}, v=${version}`);
    }
  }
}
