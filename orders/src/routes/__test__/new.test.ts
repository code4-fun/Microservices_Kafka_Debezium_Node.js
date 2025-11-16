import request from 'supertest';
import { signin } from '../../test/test-utils';
import { OrderStatus } from '@prisma/client';
import { kafkaClient } from '../../kafka-client';

let app: any;
let db: any;

beforeAll(async () => {
  const imported = await import('../../app');
  app = imported.app;

  const importedDb = await import('../../db');
  db = importedDb.db;
});

it('returns an error if the ticket does not exist', async () => {
  await request(app)
    .post('/api/orders')
    .set('Cookie', signin())
    .send({ ticketId: 'sdf' })
    .expect(404);
});

it('returns an error if the ticket is already reserved', async () => {
  const ticket = await db.ticket.create({
    data: {
      title: 'concert',
      price: 20,
      version: 0,
    }
  });

  await db.order.create({
    data: {
      ticketId: ticket.id,
      userId: 'sdf',
      status: OrderStatus.created,
      expiresAt: new Date(),
      version: 0,
    }
  });

  await request(app)
    .post('/api/orders')
    .set('Cookie', signin())
    .send({ ticketId: ticket.id })
    .expect(400);
});

it('reserves a ticket', async () => {
  const ticket = await db.ticket.create({
    data: {
      title: 'concert',
      price: 20,
      version: 0,
    }
  });

  await request(app)
    .post('/api/orders')
    .set('Cookie', signin())
    .send({ ticketId: ticket.id })
    .expect(201);
});

it('emits an order created event', async () => {
  const ticket = await db.ticket.create({
    data: {
      title: 'concert',
      price: 20,
      version: 0,
    }
  });

  await request(app)
    .post('/api/orders')
    .set('Cookie', signin())
    .send({ ticketId: ticket.id })
    .expect(201);

  expect(kafkaClient.producer.send).toHaveBeenCalled();
});
