import { Listener, OrderCancelledEvent, Topics } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { orderCancelledGroupId } from './group-id';
import { Ticket, TicketDoc } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';
import { kafkaClient } from '../../kafka-client';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  topic: Topics.OrderCancelled = Topics.OrderCancelled;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCancelledGroupId);
    super(consumer);
  }
  async onMessage(data: OrderCancelledEvent['data'], msg: EachMessagePayload) {
    const ticket = await Ticket.findById(data.ticket.id) as TicketDoc;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.set({ orderId: undefined });
    await ticket.save();

    await new TicketUpdatedPublisher().publish({
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      version: ticket.version,
      orderId: ticket.orderId,
    });
  }
}
