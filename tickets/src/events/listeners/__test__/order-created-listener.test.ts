import mongoose from 'mongoose';
import { OrderCreatedEvent } from '@aitickets123654/common-kafka';
import { Ticket } from '../../../models/ticket';
import { EachMessagePayload } from 'kafkajs';
import { OrderCreatedListener } from '../order-created-listener';
import { kafkaClient } from '../../../kafka-client';

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
  const payload: EachMessagePayload = null;

  return { listener, ticket, data, payload };
};

it('sets the orderId of the ticket', async () => {
  const { listener, ticket, data, payload } = await setup();

  await listener.onMessage(data, payload);

  const updatedTicket = await Ticket.findById(ticket.id) as Ticket;

  expect(updatedTicket!.orderId).toEqual(data.id);
});

it('publishes a ticket updated event', async () => {
  const { listener, data, payload } = await setup();

  await listener.onMessage(data, payload);

  expect(kafkaClient.producer.send).toHaveBeenCalled();

  const ticketUpdatedData = JSON.parse(
    (kafkaClient.producer.send as jest.Mock).mock.calls[0][0]['messages'][0]['value']
  );

  expect(data.id).toEqual(ticketUpdatedData.orderId);
});
