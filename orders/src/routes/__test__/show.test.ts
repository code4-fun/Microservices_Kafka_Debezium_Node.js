import request from 'supertest';
import { signin } from '../../test/test-utils';

let app: any;
let db: any;

beforeAll(async () => {
  const imported = await import('../../app');
  app = imported.app;

  const importedDb = await import('../../db');
  db = importedDb.db;
});

it('fetches the order', async () => {
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

  const { body: fetchedOrder } = await request(app)
    .get(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(200);

  expect(fetchedOrder.id).toEqual(order.id);
});

it('returns an error if one user tries to fetch another users order', async () => {
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
    .get(`/api/orders/${order.id}`)
    .set('Cookie', signin())
    .send()
    .expect(401);
});
