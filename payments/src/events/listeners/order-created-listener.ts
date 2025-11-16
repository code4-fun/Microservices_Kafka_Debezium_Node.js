import { Topics, OrderCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { orderCreatedGroupId } from './group-id';
import { Order } from '../../models/order';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  topic: Topics.OrderCreated = Topics.OrderCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: OrderCreatedEvent['data'], payload: EachMessagePayload) {
    const order = Order.build({
      id: data.id,
      price: data.ticket.price,
      status: data.status,
      userId: data.userId,
      version: data.version,
    });
    await order.save();
  }
}
