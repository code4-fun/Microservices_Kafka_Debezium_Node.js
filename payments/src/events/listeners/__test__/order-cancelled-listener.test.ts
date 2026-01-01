import mongoose from 'mongoose';
import { OrderCancelledEvent, Topics } from '@aitickets123654/common-kafka';
import { OrderCancelledListener } from '../order-cancelled-listener';
import { EachMessagePayload } from 'kafkajs';
import { Order, OrderDoc } from '../../../models/order';
import { ProcessedEvent } from "../../../models/processed-event";

const setup = async () => {
  const listener = new OrderCancelledListener();

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    status: 'created',
    price: 10,
    userId: 'sdf',
    version: 0,
  });
  await order.save();

  const data: OrderCancelledEvent['data'] = {
    id: order.id,
    version: 1,
    ticket: {
      id: 'sdf',
    },
  };

  // @ts-ignore
  const payload = {
    message: {
      headers: {
        eventId: Buffer.from('test-event-id'),
      },
    },
  } as EachMessagePayload;

  return { payload, data, listener, order };
};

it('updates the status of the order', async () => {
  const { payload, data, listener, order } = await setup();

  await listener.onMessage(data, payload);

  const updatedOrder = await Order.findById(order.id) as OrderDoc;

  expect(updatedOrder!.status).toEqual('cancelled');
});

it('listener is idempotent for duplicate event', async () => {
  const { listener, data, payload } = await setup();

  await listener.onMessage(data, payload);
  await listener.onMessage(data, payload);

  const orders = await Order.find();
  expect(orders).toHaveLength(1);

  const order = orders[0];
  expect(order.id).toBe(data.id);
  expect(order.status).toEqual('cancelled');

  const events = await ProcessedEvent.find({
    topic: Topics.OrderCancelled,
  });
  expect(events).toHaveLength(1);
});
