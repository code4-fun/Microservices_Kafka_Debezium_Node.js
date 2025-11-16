import mongoose from 'mongoose';
import { OrderCancelledEvent } from '@aitickets123654/common-kafka';
import { OrderCancelledListener } from '../order-cancelled-listener';
import { EachMessagePayload } from 'kafkajs';
import {Ticket, TicketDoc} from '../../../models/ticket';
import { kafkaClient } from '../../../kafka-client';

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
  const payload: EachMessagePayload = null;

  return { payload, data, ticket, orderId, listener };
};

it('updates the ticket, publishes an event, and acks the message', async () => {
  const { payload, data, ticket, orderId, listener } = await setup();

  await listener.onMessage(data, payload);

  const updatedTicket = await Ticket.findById(ticket.id) as TicketDoc;
  expect(updatedTicket!.orderId).not.toBeDefined();
  expect(kafkaClient.producer.send).toHaveBeenCalled();
});
