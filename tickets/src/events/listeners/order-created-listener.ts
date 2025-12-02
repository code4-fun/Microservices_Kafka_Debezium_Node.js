import { Topics, OrderCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { orderCreatedGroupId } from './group-id';
import { Ticket, TicketDoc } from '../../models/ticket';
import mongoose from 'mongoose';
import { createOutboxEvent } from '../workers/create-outbox-event';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  topic: Topics.OrderCreated = Topics.OrderCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: OrderCreatedEvent['data'], payload: EachMessagePayload) {
    console.log(`OrderCreatedEvent received id=${data.id}, v=${data.version}`);
    const session = await mongoose.startSession();
    session.startTransaction();

    const ticket = await Ticket.findById(data.ticket.id) as TicketDoc;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    try {
      ticket.set({ orderId: data.id });
      await ticket.save({ session });

      await createOutboxEvent({
        aggregateType: 'ticket',
        aggregateId: ticket.id,
        eventType: 'TicketUpdated',
        payload: {
          id: ticket.id,
          title: ticket.title,
          price: ticket.price,
          userId: ticket.userId,
          orderId: ticket.orderId || null,
          version: ticket.version,
        },
        session,
      });

      await session.commitTransaction();
      await session.endSession();
    } catch (err) {
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  }
}
