import { Ticket, TicketDoc } from '../ticket';

it('implements optimistic concurrency control', async () => {
  const ticket = Ticket.build({
    title: 'concert',
    price: 5,
    userId: '123',
  });

  await ticket.save();

  const firstInstance = await Ticket.findById(ticket.id) as TicketDoc;
  const secondInstance = await Ticket.findById(ticket.id) as TicketDoc;

  firstInstance.set({ price: 10 });
  secondInstance.set({ price: 15 });

  await firstInstance.save();

  await expect(secondInstance.save()).rejects.toThrow();
});

it('increments the version number on multiple saves', async () => {
  const ticket = Ticket.build({
    title: 'concert',
    price: 20,
    userId: '123',
  });

  await ticket.save();
  expect(ticket.version).toEqual(0);
  ticket.set({ price: 21 });
  await ticket.save();
  expect(ticket.version).toEqual(1);
  ticket.set({ price: 22 });
  await ticket.save();
  expect(ticket.version).toEqual(2);
});
