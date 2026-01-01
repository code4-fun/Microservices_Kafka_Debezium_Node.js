import request from 'supertest';
import { app } from '../../app';
import mongoose from 'mongoose';
import { signin } from '../../test/test-utils';
import { Ticket, TicketDoc } from '../../models/ticket';
import { Outbox } from "../../models/outbox";

const mockPublish = jest.fn().mockResolvedValue(undefined);
jest.mock('../../events/publishers/ticket-updated-publisher', () => ({
  TicketUpdatedPublisher: jest.fn().mockImplementation(() => ({
    publish: mockPublish,
  })),
}));

it('returns a 404 if the provided id does not exist', async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .set('Cookie', signin())
    .send({
      title: 'sdfsdf',
      price: 20,
    })
    .expect(404);
});

it('returns a 401 if the user is not authenticated', async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .send({
      title: 'sdfsdf',
      price: 20,
    })
    .expect(401);
});

it('returns a 401 if the user does not own the ticket', async () => {
  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', signin())
    .send({
      title: 'sdf',
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', signin())
    .send({
      title: 'sdfsdf',
      price: 30,
    })
    .expect(401);
});

it('returns a 400 if the user provides an invalid title or price', async () => {
  const cookie = signin();
  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({
      title: 'hello world',
      price: 20
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({
      title: '',
      price: 30,
    })
    .expect(400);

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({
      title: 'sdf',
      price: 0,
    })
    .expect(400);
});

it('updates the ticket provided valid inputs', async () => {
  const cookie = signin();
  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({
      title: 'hello world',
      price: 20
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({
      title: 'new title',
      price: 200,
    });

  const updatedTicket = await request(app)
    .get(`/api/tickets/${response.body.id}`)
    .send();

  expect(updatedTicket.body.title).toEqual('new title');
  expect(updatedTicket.body.price).toEqual(200);
});

it('rejects updates if the ticket is reserved', async () => {
  const cookie = signin();

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({
      title: 'sdf',
      price: 20,
    });

  const ticket = await Ticket.findById(response.body.id) as TicketDoc;
  ticket!.set({ orderId: new mongoose.Types.ObjectId().toHexString() });
  await ticket!.save();

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({
      title: 'new title',
      price: 100,
    })
    .expect(400);
});

it('creates an outbox event for ticket update', async () => {
  const cookie = signin();

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({
      title: 'sdf',
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({
      title: 'new title',
      price: 100,
    })
    .expect(200);


  const tickets = await Ticket.find({ title: 'new title' });
  expect(tickets).toHaveLength(1);

  const ticket = tickets[0];
  const outboxRecords = await Outbox.find({
    aggregateId: ticket.id,
    eventType: 'TicketUpdated'
  });
  expect(outboxRecords).toHaveLength(1);
});

it('should publish TicketUpdated events from outbox', async () => {
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
    eventType: 'TicketUpdated',
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
