import { Topics, OrderCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { orderCreatedGroupId } from './group-id';
import { Order } from '../../models/order';
import mongoose from 'mongoose';
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

        await Order.build({
          id: data.id,
          price: data.ticket.price,
          status: data.status,
          userId: data.userId,
          version: data.version,
        }).save({ session });

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
