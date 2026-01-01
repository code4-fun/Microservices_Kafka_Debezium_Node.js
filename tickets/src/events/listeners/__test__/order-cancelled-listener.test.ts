import mongoose from 'mongoose';
import { OrderCancelledEvent, Topics } from '@aitickets123654/common-kafka';
import { OrderCancelledListener } from '../order-cancelled-listener';
import { EachMessagePayload } from 'kafkajs';
import { Ticket, TicketDoc } from '../../../models/ticket';
import { Outbox } from '../../../models/outbox';
import { TicketUpdatedPublisher } from '../../publishers/ticket-updated-publisher';
import { ProcessedEvent } from '../../../models/processed-event';

jest.mock('../../publishers/ticket-updated-publisher');

const setup = async () => {
  const listener = new OrderCancelledListener();

  const orderId = new mongoose.Types.ObjectId().toHexString();

  const ticket = Ticket.build({
    title: 'concert',
    price: 20,
    userId: 'sdf',
  });

  ticket.set({ orderId });
  await ticket.save();

  const data: OrderCancelledEvent['data'] = {
    id: orderId,
    version: 0,
    ticket: {
      id: ticket.id,
    },
  };

  // @ts-ignore
  const payload = {
    message: {
      headers: {
        eventId: Buffer.from('test-event-id'),
      },
    },
  } as EachMessagePayload;

  return { payload, data, ticket, orderId, listener };
};

afterEach(() => {
  jest.restoreAllMocks();
});

it('should clear orderId from ticket when order is cancelled', async () => {
  const { payload, data, ticket, listener } = await setup();

  await listener.onMessage(data, payload);

  const updatedTicket = await Ticket.findById(ticket.id) as TicketDoc;
  expect(updatedTicket!.orderId).not.toBeDefined();
});

it('should throw error if ticket not found', async () => {
  const { payload, data, listener } = await setup();

  // создаем данные с несуществующим ticket.id
  const invalidData = {
    ...data,
    ticket: {
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
    orderId: null,
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
  expect(freshTicket!.orderId).not.toBeUndefined();

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

// Тест на корректность вызова TicketUpdatedPublisher через outbox worker
it('should trigger TicketUpdatedPublisher when outbox worker processes the event', async () => {
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
      orderId: null,
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

  expect(updatedTicket!.orderId).not.toBeDefined();

  const events = await ProcessedEvent.find({
    topic: Topics.OrderCancelled,
  });

  expect(events).toHaveLength(1);
});
