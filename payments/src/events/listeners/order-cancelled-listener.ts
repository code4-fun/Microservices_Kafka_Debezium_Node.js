import { Listener, OrderCancelledEvent, Topics } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { orderCancelledGroupId } from './group-id';
import { Order, OrderDoc } from '../../models/order';
import { kafkaClient } from "../../kafka-client";

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  topic: Topics.OrderCancelled = Topics.OrderCancelled;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCancelledGroupId);
    super(consumer);
  }
  async onMessage(data: OrderCancelledEvent['data'], msg: EachMessagePayload) {
    const version = parseInt(data.version as any);
    if (isNaN(version)) {
      throw new Error(`Invalid version: ${data.version}`);
    }

    console.log('data!!!', data)

    const order = await Order.findOne({
      _id: data.id,
      version: version - 1,
    }) as OrderDoc;

    if (!order) {
      throw new Error('Order not found');
    }

    order.set({ status: 'cancelled' });
    await order.save();
  }
}
