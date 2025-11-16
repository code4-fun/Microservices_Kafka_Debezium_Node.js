import { Topics, ExpirationCompleteEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { expirationCompleteGroupId } from './group-id';
import { fetchOrderByIdWithTicket, updateOrderWithVersion } from '../../services/orders.service';
import { OrderStatus } from '@prisma/client';
import { OrderCancelledPublisher } from '../publishers/order-cancelled-publisher';

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
  topic: Topics.ExpirationComplete = Topics.ExpirationComplete;

  constructor() {
    const consumer = kafkaClient.createConsumer(expirationCompleteGroupId);
    super(consumer);
  }

  async onMessage(data: ExpirationCompleteEvent['data'], payload: EachMessagePayload) {
    const { orderId } = data;
    console.log(`ExpirationCompleteEvent received orderId=${orderId}`);

    const order = await fetchOrderByIdWithTicket(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === OrderStatus.complete) {
      return;
    }

    const updatedOrder = await updateOrderWithVersion({
      id: orderId,
      version: order.version,
      data: {
        status: OrderStatus.cancelled
      }
    });

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    await new OrderCancelledPublisher().publish({
      id: updatedOrder.id,
      ticket: {
        id: updatedOrder.ticketId,
      },
      version: updatedOrder.version,
    });
  }
}
