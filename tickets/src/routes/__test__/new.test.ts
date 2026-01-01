import request from 'supertest';
import { app } from '../../app';
import { signin } from '../../test/test-utils';
import { Ticket } from '../../models/ticket';
import { Outbox } from '../../models/outbox';

const mockPublish = jest.fn().mockResolvedValue(undefined);
jest.mock('../../events/publishers/ticket-created-publisher', () => ({
  TicketCreatedPublisher: jest.fn().mockImplementation(() => ({
    publish: mockPublish,
  })),
}));

it('has a route handler listening to /api/tickets for post requests', async () => {
  const response = await request(app)
    .post('/api/tickets')
    .send({});

  expect(response.status).not.toEqual(404);
});

it('can only be accessed if the user is signed in', async () => {
  await request(app).post('/api/tickets').send({}).expect(401);
});

it('returns a status other than 401 if the user is signed in', async () => {
  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({});

  expect(response.status).not.toEqual(401);
})

it('returns an error if an invalid title is provided', async () => {
  await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({
      title: '',
      price: 10,
    })
    .expect(400);

  await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({
      price: 10,
    })
    .expect(400);
});

it('returns an error if an invalid price is provided', async () => {
  await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({
      title: 'sdf',
      price: -10,
    })
    .expect(400);

  await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({
      title: 'sdf',
    })
    .expect(400);
});

it('creates a ticket with valid inputs', async () => {
  let tickets = await Ticket.find({});
  expect(tickets.length).toEqual(0);

  const title = 'sdf';

  await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({
      title,
      price: 20,
    })
    .expect(201);

  tickets = await Ticket.find({});
  expect(tickets.length).toEqual(1);
  expect(tickets[0].price).toEqual(20);
  expect(tickets[0].title).toEqual(title);
});

it('creates an outbox event for ticket creation', async () => {
  const title = 'sdf';

  await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({
      title,
      price: 20,
    })
    .expect(201);

  const tickets = await Ticket.find({ title });
  expect(tickets).toHaveLength(1);

  const ticket = tickets[0];
  const outboxRecords = await Outbox.find({
    aggregateId: ticket.id,
    eventType: 'TicketCreated'
  });
  expect(outboxRecords).toHaveLength(1);
});

it('should publish TicketCreated events from outbox', async () => {
  const ticket = Ticket.build({
    title: 'test',
    price: 100,
    userId: 'user123',
  });
  await ticket.save();

  await Outbox.create({
    eventId: 'event_id',
    aggregateType: 'ticket',
    aggregateId: ticket.id,
    eventType: 'TicketCreated',
    payload: {
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      version: ticket.version,
    },
    status: 'pending',
  });

  // запускаем worker один раз
  const { runOutboxWorkerOnce } = require('../../events/workers/outbox-worker');
  await runOutboxWorkerOnce();

  // проверяем, что publisher был вызван с правильными данными
  expect(mockPublish).toHaveBeenCalledWith(
    {
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      version: ticket.version,
    },
    expect.any(Object)
  );

  // проверяем, что статус outbox записи обновлен
  const outboxRecord = await Outbox.findOne({ aggregateId: ticket.id });
  expect(outboxRecord!.status).toBe('published');
});
