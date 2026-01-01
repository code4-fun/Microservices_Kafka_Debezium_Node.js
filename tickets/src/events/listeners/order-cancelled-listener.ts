import { Listener, OrderCancelledEvent, Topics } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { orderCancelledGroupId } from './group-id';
import { Ticket } from '../../models/ticket';
import { kafkaClient } from '../../kafka-client';
import mongoose from 'mongoose';
import { Outbox } from '../../models/outbox';
import { randomUUID } from 'crypto';
import { ProcessedEvent } from '../../models/processed-event';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  topic: Topics.OrderCancelled = Topics.OrderCancelled;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCancelledGroupId);
    super(consumer);
  }

  async onMessage(data: OrderCancelledEvent['data'], payload: EachMessagePayload) {
    console.log(`OrderCancelledEvent received id=${data.id}, v=${data.version}`);

    const eventId = payload.message.headers?.eventId?.toString();
    if (!eventId) {
      throw new Error('eventId is required');
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await ProcessedEvent.build(
          {
            eventId,
            topic: Topics.OrderCancelled
          }
        ).save({ session });

        const ticket = await Ticket.findById(data.ticket.id).session(session);
        if (!ticket) {
          throw new Error('Ticket not found');
        }

        ticket.set({ orderId: undefined });
        await ticket.save({ session });

        await Outbox.build(
          {
            eventId: randomUUID(),
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
      });
    } catch (err: any) {
      // duplicate event → safe skip
      if (err.code === 11000) {
        return;
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
