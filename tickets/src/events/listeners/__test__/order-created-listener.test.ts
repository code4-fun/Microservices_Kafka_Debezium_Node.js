import mongoose from 'mongoose';
import { OrderCreatedEvent, Topics } from '@aitickets123654/common-kafka';
import { Ticket, TicketDoc } from '../../../models/ticket';
import { EachMessagePayload } from 'kafkajs';
import { OrderCreatedListener } from '../order-created-listener';
import { Outbox } from '../../../models/outbox';
import { TicketUpdatedPublisher } from '../../publishers/ticket-updated-publisher';
import { ProcessedEvent } from '../../../models/processed-event';

jest.mock('../../publishers/ticket-updated-publisher');

const setup = async () => {
  const listener = new OrderCreatedListener();

  const ticket = Ticket.build({
    title: 'concert',
    price: 99,
    userId: 'sdf',
  });
  await ticket.save();

  const data: OrderCreatedEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    status: 'created',
    userId: 'sdf',
    expiresAt: 'sdf',
    ticket: {
      id: ticket.id,
      price: ticket.price,
    },
    version: 0,
  };

  // @ts-ignore
  const payload = {
    message: {
      headers: {
        eventId: Buffer.from('test-event-id'),
      },
    },
  } as EachMessagePayload;

  return { listener, ticket, data, payload };
};

afterEach(() => {
  jest.restoreAllMocks();
});

it('sets the orderId of the ticket', async () => {
  const { listener, ticket, data, payload } = await setup();

  await listener.onMessage(data, payload);

  const updatedTicket = await Ticket.findById(ticket.id) as TicketDoc;

  expect(updatedTicket!.orderId).toEqual(data.id);
});

it('should throw error if ticket not found', async () => {
  const { payload, data, listener } = await setup();

  // создаем данные с несуществующим ticket.id
  const invalidData = {
    ...data,
    ticket: {
      ...data.ticket,
      id: new mongoose.Types.ObjectId().toHexString(),
    },
  };

  await expect(listener.onMessage(invalidData, payload))
    .rejects
    .toThrow('Ticket not found');
});

it('should create outbox event when ticket is updated', async () => {
  const { payload, data, ticket, listener } = await setup();

  await listener.onMessage(data, payload);

  const outboxRecords = await Outbox.find({ aggregateId: ticket.id });
  expect(outboxRecords).toHaveLength(1);

  const outboxRecord = outboxRecords[0];
  expect(outboxRecord.aggregateType).toBe('ticket');
  expect(outboxRecord.aggregateId).toBe(ticket.id);
  expect(outboxRecord.eventType).toBe('TicketUpdated');
  expect(outboxRecord.payload).toEqual({
    id: ticket.id,
    title: ticket.title,
    price: ticket.price,
    userId: ticket.userId,
    orderId: data.id,
    version: ticket.version + 1,
  });
});

it('does not persist changes if transaction fails', async () => {
  const { payload, data, listener, ticket } = await setup();

  // ломаем сохранение
  jest
    .spyOn(Ticket.prototype, 'save')
    .mockRejectedValueOnce(new Error('Save failed'));

  await expect(
    listener.onMessage(data, payload)
  ).rejects.toThrow('Save failed');

  // ticket НЕ должен быть зарезервирован
  const freshTicket = await Ticket.findById(ticket.id);
  expect(freshTicket!.orderId).toBeUndefined();

  // outbox НЕ должен быть создан
  const outboxEvents = await Outbox.find({});
  expect(outboxEvents).toHaveLength(0);
});

it('should increment ticket version after update', async () => {
  const { payload, data, ticket, listener } = await setup();
  const initialVersion = ticket.version;

  await listener.onMessage(data, payload);

  const updatedTicket = await Ticket.findById(ticket.id) as TicketDoc;
  expect(updatedTicket.version).toBe(initialVersion + 1);
});

// Тест на корректность вызова TicketCreatedPublisher через outbox worker
it('should trigger TicketCreatedPublisher when outbox worker processes the event', async () => {
  const { payload, data, ticket, listener } = await setup();

  await listener.onMessage(data, payload);

  // Получаем созданную в outbox запись
  const outboxRecords = await Outbox.find({ aggregateId: ticket.id });
  expect(outboxRecords).toHaveLength(1);

  // Имитируем обработку outbox worker'ом
  const outboxRecord = outboxRecords[0];
  const mockPublisherInstance = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  // Mock TicketUpdatedPublisher
  (TicketUpdatedPublisher as jest.MockedClass<typeof TicketUpdatedPublisher>)
    .mockImplementation(() => mockPublisherInstance as any);

  // Вызываем функцию обработки outbox
  const { processEventTyped } = require('../../workers/outbox-worker');
  await processEventTyped(outboxRecord);

  // Проверяем что publisher был вызван
  expect(TicketUpdatedPublisher).toHaveBeenCalled();
  expect(mockPublisherInstance.publish).toHaveBeenCalledWith(
    expect.objectContaining({
      id: ticket.id,
      orderId: data.id,
      version: ticket.version + 1,
    }),
    expect.any(Object)
  );
});

it('listener is idempotent for duplicate event', async () => {
  const { listener, ticket, data, payload } = await setup();

  await listener.onMessage(data, payload);
  await listener.onMessage(data, payload);

  const updatedTicket = await Ticket.findById(ticket.id) as TicketDoc;

  expect(updatedTicket!.orderId).toEqual(data.id);

  const events = await ProcessedEvent.find({
    topic: Topics.OrderCreated,
  });

  expect(events).toHaveLength(1);
});

