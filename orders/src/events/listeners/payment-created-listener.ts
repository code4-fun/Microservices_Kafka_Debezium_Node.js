import { Topics, Listener, PaymentCreatedEvent } from '@aitickets123654/common-kafka';
import { paymentCreatedGroupId } from './group-id';
import { kafkaClient } from '../../kafka-client';
import { EachMessagePayload } from 'kafkajs';
import { OrderStatus } from '@prisma/client';
import { fetchOrderByIdWithTicket, updateOrderWithVersion } from '../../services/orders.service';

export class PaymentCreatedListener extends Listener<PaymentCreatedEvent> {
  topic: Topics.PaymentCreated = Topics.PaymentCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(paymentCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: PaymentCreatedEvent['data'], msg: EachMessagePayload) {
    const order = await fetchOrderByIdWithTicket(data.orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    await updateOrderWithVersion({
      id: order.id,
      version: order.version,
      data: {
        status: OrderStatus.complete
      }
    });
  }
}
