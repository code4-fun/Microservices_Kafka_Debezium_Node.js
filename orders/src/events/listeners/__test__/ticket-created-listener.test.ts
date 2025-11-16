import { TicketCreatedEvent } from '@aitickets123654/common-kafka';
import { EachMessagePayload } from 'kafkajs';

jest.mock('../../../kafka-client');

let db: any;
let TicketCreatedListener: any;

beforeAll(async () => {
  const importedDb = await import('../../../db');
  db = importedDb.db;

  const importedListener = await import('../ticket-created-listener');
  TicketCreatedListener = importedListener.TicketCreatedListener;
});

const setup = async () => {
  const listener = new TicketCreatedListener();

  const data: TicketCreatedEvent['data'] = {
    version: 0,
    id: 'sdf',
    title: 'concert',
    price: 10,
    userId: 'sdf',
  };

  // @ts-ignore
  const payload: EachMessagePayload = null;

  return { listener, data, payload };
};

it('creates and saves a ticket', async () => {
  const { listener, data, payload } = await setup();

  await listener.onMessage(data, payload);

  const ticket = await db.ticket.findUnique({
    where: { id: data.id }
  });

  expect(ticket).toBeDefined();
  expect(ticket!.title).toEqual(data.title);
  expect(ticket!.price).toEqual(data.price);
});
