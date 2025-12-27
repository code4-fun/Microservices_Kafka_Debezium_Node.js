import { Topics, ExpirationCompleteEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { expirationCompleteGroupId } from './group-id';
import { fetchOrderByIdWithTicket, updateOrderWithVersion } from '../../services/orders.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { db } from '../../db';

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
    
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedOrder = await updateOrderWithVersion({
        id: orderId,
        version: order.version,
        data: {
          status: OrderStatus.cancelled
        },
      }, tx);

      if (!updatedOrder) {
        throw new Error('Order not found');
      }

      await tx.outbox.create({
        data: {
          aggregatetype: 'order',
          aggregateid: updatedOrder.id,
          type: 'orders.order.cancelled.v1',
          payload: {
            id: updatedOrder.id,
            ticket: {
              id: updatedOrder.ticketId,
            },
            version: updatedOrder.version,
          },
        },
      });

      return updatedOrder;
    });
  }
}
