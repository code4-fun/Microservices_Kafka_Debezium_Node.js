import mongoose from 'mongoose';
import { OrderCancelledEvent } from '@aitickets123654/common-kafka';
import { OrderCancelledListener } from '../order-cancelled-listener';
import { EachMessagePayload } from 'kafkajs';
import { Order } from '../../../models/order';

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
  const payload: EachMessagePayload = null;

  return { payload, data, listener, order };
};

it('updates the status of the order', async () => {
  const { payload, data, listener, order } = await setup();

  await listener.onMessage(data, payload);

  const updatedOrder = await Order.findById(order.id) as Order;

  expect(updatedOrder!.status).toEqual('cancelled');
});
