import { Topics, OrderCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { orderCreatedGroupId } from './group-id';
import { Ticket, TicketDoc } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  topic: Topics.OrderCreated = Topics.OrderCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: OrderCreatedEvent['data'], payload: EachMessagePayload) {
    console.log(`OrderCreatedEvent received id=${data.id}, v=${data.version}`);

    const ticket = await Ticket.findById(data.ticket.id) as TicketDoc;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.set({ orderId: data.id });
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
