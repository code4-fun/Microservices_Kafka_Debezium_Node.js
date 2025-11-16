import { ExpirationCompleteEvent } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { OrderStatus } from '@prisma/client';
import { kafkaClient } from '../../../kafka-client';

let db: any;
let ExpirationCompleteListener: any;

beforeAll(async () => {
  const importedDb = await import('../../../db');
  db = importedDb.db;

  const importedListener = await import('../expiration-complete-listener');
  ExpirationCompleteListener = importedListener.ExpirationCompleteListener;
});

const setup = async () => {
  const listener = new ExpirationCompleteListener();

  const ticket = await db.ticket.create({
    data: {
      id: 'sdf',
      title: 'concert',
      price: 20,
      version: 0,
    }
  });

  const order = await db.order.create({
    data: {
      ticketId: ticket.id,
      userId: 'sdf',
      status: OrderStatus.created,
      expiresAt: new Date(),
      version: 0,
    }
  });

  const data: ExpirationCompleteEvent['data'] = {
    orderId: order.id,
  };

  // @ts-ignore
  const payload: EachMessagePayload = null;

  return { payload, data, ticket, listener, order };
};

it('updates the order status to cancelled', async () => {
  const { listener, order, data, payload } = await setup();

  await listener.onMessage(data, payload);

  const updatedOrder = await db.order.findUnique({
    where: { id: order.id }
  });

  expect(updatedOrder!.status).toEqual(OrderStatus.cancelled);
});

it('emit an OrderCancelled event', async () => {
  const { listener, order, data, payload } = await setup();

  await listener.onMessage(data, payload);

  expect(kafkaClient.producer.send).toHaveBeenCalled();

  const eventData = JSON.parse(
    (kafkaClient.producer.send as jest.Mock).mock.calls[0][0]['messages'][0]['value']
  );

  expect(order.id).toEqual(eventData.id);
});
