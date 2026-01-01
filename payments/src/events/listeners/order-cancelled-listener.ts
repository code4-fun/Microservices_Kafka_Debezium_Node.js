import { Listener, OrderCancelledEvent, Topics } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { orderCancelledGroupId } from './group-id';
import { Order, OrderDoc } from '../../models/order';
import { kafkaClient } from '../../kafka-client';
import mongoose from 'mongoose';
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

        const version = parseInt(data.version as any);
        if (isNaN(version)) {
          throw new Error(`Invalid version: ${data.version}`);
        }

        const order = await Order.findOne({
          _id: data.id,
          version: version - 1,
        }) as OrderDoc;

        if (!order) {
          throw new Error('Order not found');
        }

        order.set({ status: 'cancelled' });
        await order.save({ session });
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
