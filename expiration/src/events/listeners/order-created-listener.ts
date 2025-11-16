import { Topics, OrderCreatedEvent, Listener } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { kafkaClient } from '../../kafka-client'
import { orderCreatedGroupId } from './group-id';
import { expirationQueue } from '../../queues/expiration-queue';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  topic: Topics.OrderCreated = Topics.OrderCreated;

  constructor() {
    const consumer = kafkaClient.createConsumer(orderCreatedGroupId);
    super(consumer);
  }

  async onMessage(data: OrderCreatedEvent['data'], payload: EachMessagePayload) {
    console.log(`OrderCreatedEvent received id=${data.id}, v=${data.version}`);

    const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
    console.log('Waiting this many milliseconds to process the job:', delay);

    await expirationQueue.add(
      {
        orderId: data.id,
      },
      {
        delay,
      }
    );
  }
}
