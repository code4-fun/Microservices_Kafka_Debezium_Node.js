import { TicketUpdatedEvent, Topics } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';

let db: any;
let TicketUpdatedListener: any;

beforeAll(async () => {
  const importedDb = await import('../../../db');
  db = importedDb.db;

  const importedListener = await import('../ticket-updated-listener');
  TicketUpdatedListener = importedListener.TicketUpdatedListener;
});

const setup = async () => {
  const listener = new TicketUpdatedListener();

  const ticket = await db.ticket.create({
    data: {
      id: 'sdf',
      title: 'concert',
      price: 20,
      version: 0,
    }
  });

  const data: TicketUpdatedEvent['data'] = {
    id: ticket.id,
    version: ticket.version + 1,
    title: 'new concert',
    price: 999,
    userId: 'dfg',
    orderId: null,
  };

  // @ts-ignore
  const payload = {
    message: {
      headers: {
        eventId: Buffer.from('test-event-id'),
      },
    },
  } as EachMessagePayload;

  return { payload, data, ticket, listener };
};

it('finds, updates, and saves a ticket', async () => {
  const { payload, data, ticket, listener } = await setup();

  await listener.onMessage(data, payload);

  const updatedTicket = await db.ticket.findUnique({
    where: { id: ticket.id }
  });

  expect(updatedTicket!.title).toEqual(data.title);
  expect(updatedTicket!.price).toEqual(data.price);
  expect(updatedTicket!.version).toEqual(data.version);
});

it('listener is idempotent for duplicate event', async () => {
  const { listener, data, payload } = await setup();

  await listener.onMessage(data, payload);
  await listener.onMessage(data, payload);

  const ticket = await db.ticket.findUnique({
    where: { id: data.id },
  });

  expect(ticket).toBeDefined();
  expect(ticket!.title).toBe('new concert');
  expect(ticket!.price).toBe(999);
  expect(ticket!.version).toBe(1);

  const events = await db.processedEvent.findMany({
    where: {
      topic: Topics.TicketUpdated,
    },
  });

  expect(events).toHaveLength(1);
});
