import { Topics, Listener, PaymentCreatedEvent } from '@aitickets123654/common-kafka';
import { paymentCreatedGroupId } from './group-id';
import { kafkaClient } from '../../kafka-client';
import { EachMessagePayload } from 'kafkajs';
import { OrderStatus } from '@prisma/client';
import { fetchOrderByIdWithTicket, updateOrderFromEvent } from '../../services/orders.service';

export class PaymentCreatedListener extends Listener<PaymentCreatedEvent> {
  topic: Topics.PaymentCreated = Topics.PaymentCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(paymentCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: PaymentCreatedEvent['data'], payload: EachMessagePayload) {
    const order = await fetchOrderByIdWithTicket(data.orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    console.log(`PaymentCreatedEvent received orderId=${order.id}`);

    const eventId = payload.message.headers?.eventId?.toString();
    if (!eventId) {
      throw new Error('eventId is required for idempotent processing');
    }

    await updateOrderFromEvent(
      eventId,
      {
        id: order.id,
        version: order.version,
        data: {
          status: OrderStatus.complete
        }
      }
    );
  }
}
