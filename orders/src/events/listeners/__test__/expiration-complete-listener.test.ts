import { ExpirationCompleteEvent, Topics } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';
import { OrderStatus } from '@prisma/client';

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
  const payload = {
    message: {
      headers: {
        eventId: Buffer.from('test-event-id'),
      },
    },
  } as EachMessagePayload;

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

it('creates an outbox record when order cancelled', async () => {
  const { listener, order, data, payload } = await setup();

  await listener.onMessage(data, payload);

  const outbox = await db.outbox.findMany({
    where: {
      aggregateid: order.id,
      type: {
        contains: 'orders.order.cancelled',
      },
    },
  });

  expect(outbox).toHaveLength(1);
});

it('listener is idempotent for duplicate event', async () => {
  const { listener, order, data, payload } = await setup();

  await listener.onMessage(data, payload);
  await listener.onMessage(data, payload);

  const updatedOrder = await db.order.findUnique({
    where: { id: order.id }
  });

  expect(updatedOrder!.status).toEqual(OrderStatus.cancelled);

  const events = await db.processedEvent.findMany({
    where: {
      topic: Topics.ExpirationComplete,
    },
  });

  expect(events).toHaveLength(1);
});
