import request from 'supertest';
import { OrderStatus } from '@prisma/client';
import { signin } from '../../test/test-utils';
import { kafkaClient } from '../../kafka-client';

let app: any;
let db: any;

beforeAll(async () => {
  const imported = await import('../../app');
  app = imported.app;

  const importedDb = await import('../../db');
  db = importedDb.db;
});

it('marks an order as cancelled', async () => {
  const ticket = await db.ticket.create({
    data: {
      title: 'concert',
      price: 20,
      version: 0,
    }
  });

  const user = signin();
  const { body: order } = await request(app)
    .post('/api/orders')
    .set('Cookie', user)
    .send({ ticketId: ticket.id })
    .expect(201);

  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(204);

  const updatedOrder = await db.order.findUnique({
    where: { id: order.id },
  });

  expect(updatedOrder!.status).toEqual(OrderStatus.cancelled);
});

it('creates an outbox record when order cancelled', async () => {
  const ticket = await db.ticket.create({
    data: {
      title: 'concert',
      price: 20,
      version: 0,
    }
  });

  const user = signin();
  const { body: order } = await request(app)
    .post('/api/orders')
    .set('Cookie', user)
    .send({ ticketId: ticket.id })
    .expect(201);

  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(204);

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
