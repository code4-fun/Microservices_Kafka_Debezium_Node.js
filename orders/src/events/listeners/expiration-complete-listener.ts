import { Topics, ExpirationCompleteEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { expirationCompleteGroupId } from './group-id';
import { fetchOrderByIdWithTicket, updateOrderWithVersion } from '../../services/orders.service';
import { OrderStatus } from '@prisma/client';
import { db } from '../../db';
import { randomUUID } from 'crypto';

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
  topic: Topics.ExpirationComplete = Topics.ExpirationComplete;

  constructor() {
    const consumer = kafkaClient.createConsumer(expirationCompleteGroupId);
    super(consumer);
  }

  async onMessage(data: ExpirationCompleteEvent['data'], payload: EachMessagePayload) {
    const { orderId } = data;
    console.log(`ExpirationCompleteEvent received orderId=${orderId}`);

    const eventId = payload.message.headers?.eventId?.toString();
    if (!eventId) {
      throw new Error('eventId is required');
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.processedEvent.create({
          data: {
            eventId,
            topic: Topics.ExpirationComplete,
          },
        });

        const order = await fetchOrderByIdWithTicket(orderId);
        if (!order || order.status === OrderStatus.complete) {
          return;
        }

        const updatedOrder = await updateOrderWithVersion({
          id: orderId,
          version: order.version,
          data: {
            status: OrderStatus.cancelled
          },
        }, tx);

        if (!updatedOrder) {
          throw new Error('Out of order');
        }

        await tx.outbox.create({
          data: {
            eventId: randomUUID(),
            aggregatetype: 'order',
            aggregateid: updatedOrder.id,
            type: 'orders.order.cancelled.v1',
            payload: {
              id: updatedOrder.id,
              ticket: {
                id: updatedOrder.ticketId
              },
              version: updatedOrder.version,
            },
          },
        });
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // P2002 — Unique constraint failed -> событие уже обработано
        return;
      }
      throw err;
    }
  }
}
