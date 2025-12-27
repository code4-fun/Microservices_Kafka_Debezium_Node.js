import { Listener, OrderCancelledEvent, Topics } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { orderCancelledGroupId } from './group-id';
import { Ticket, TicketDoc } from '../../models/ticket';
import { kafkaClient } from '../../kafka-client';
import mongoose from 'mongoose';
import { Outbox } from '../../models/outbox';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  topic: Topics.OrderCancelled = Topics.OrderCancelled;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCancelledGroupId);
    super(consumer);
  }

  async onMessage(data: OrderCancelledEvent['data'], msg: EachMessagePayload) {
    console.log(`OrderCancelledEvent received id=${data.id}, v=${data.version}`);
    const session = await mongoose.startSession();
    session.startTransaction();

    const ticket = await Ticket.findById(data.ticket.id) as TicketDoc;

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    try {
      ticket.set({ orderId: undefined });
      await ticket.save({ session });

      await Outbox.build(
        {
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
        },
      ).save({ session });

      await session.commitTransaction();
      await session.endSession();
    } catch (err) {
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  }
}
