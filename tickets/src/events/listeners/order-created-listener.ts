import { Topics, OrderCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { orderCreatedGroupId } from './group-id';
import { Ticket } from '../../models/ticket';
import mongoose from 'mongoose';
import { Outbox } from '../../models/outbox';
import { randomUUID } from 'crypto';
import { ProcessedEvent } from '../../models/processed-event';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  topic: Topics.OrderCreated = Topics.OrderCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: OrderCreatedEvent['data'], payload: EachMessagePayload) {
    console.log(`OrderCreatedEvent received id=${data.id}, v=${data.version}`);

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
            topic: Topics.OrderCreated
          }
        ).save({ session });

        const ticket = await Ticket.findById(data.ticket.id).session(session);
        if (!ticket) {
          throw new Error('Ticket not found');
        }

        if (ticket.orderId === data.id) {
          return;  // additional idempotency
        }

        ticket.set({ orderId: data.id });
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
