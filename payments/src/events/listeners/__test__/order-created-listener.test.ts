import mongoose from 'mongoose';
import { OrderCreatedEvent, Topics } from '@aitickets123654/common-kafka';
import { Order, OrderDoc } from '../../../models/order';
import { EachMessagePayload } from 'kafkajs';
import { OrderCreatedListener } from '../order-created-listener';
import { ProcessedEvent } from '../../../models/processed-event';

const setup = async () => {
  const listener = new OrderCreatedListener();

  const data: OrderCreatedEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    status: 'created',
    userId: 'sdf',
    expiresAt: 'sdf',
    ticket: {
      id: 'sdf',
      price: 10,
    },
    version: 0,
  };

  // @ts-ignore
  const payload = {
    message: {
      headers: {
        eventId: Buffer.from('test-event-id'),
      },
    },
  } as EachMessagePayload;

  return { listener, data, payload };
};

it('replicates the order info', async () => {
  const { listener, data, payload } = await setup();

  await listener.onMessage(data, payload);

  const order = await Order.findById(data.id) as OrderDoc;

  expect(order!.price).toEqual(data.ticket.price);
});

it('listener is idempotent for duplicate event', async () => {
  const { listener, data, payload } = await setup();

  await listener.onMessage(data, payload);
  await listener.onMessage(data, payload);

  const orders = await Order.find();
  expect(orders).toHaveLength(1);

  const order = orders[0];
  expect(order.id).toBe(data.id);
  expect(order.status).toBe(data.status);

  const events = await ProcessedEvent.find({
    topic: Topics.OrderCreated,
  });
  expect(events).toHaveLength(1);
});
