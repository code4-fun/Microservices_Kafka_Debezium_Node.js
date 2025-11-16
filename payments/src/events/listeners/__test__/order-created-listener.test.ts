import mongoose from 'mongoose';
import { OrderCreatedEvent } from '@aitickets123654/common-kafka';
import { Order } from '../../../models/order';
import { EachMessagePayload } from 'kafkajs';
import { OrderCreatedListener } from '../order-created-listener';

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
  const payload: EachMessagePayload = null;

  return { listener, data, payload };
};

it('replicates the order info', async () => {
  const { listener, data, payload } = await setup();

  await listener.onMessage(data, payload);

  const order = await Order.findById(data.id) as Order;

  expect(order!.price).toEqual(data.ticket.price);
});
