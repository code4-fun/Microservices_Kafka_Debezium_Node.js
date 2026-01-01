import { db } from '../db';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { OrderWithTicket } from '../models/order.type';
import { Topics } from '@aitickets123654/common-kafka';

export async function isTicketReserved(ticketId: string): Promise<boolean> {
  const existingOrder = await db.order.findFirst({
    where: {
      ticketId,
      status: {
        in: [
          OrderStatus.created,
          OrderStatus.awaiting_payment,
          OrderStatus.complete,
        ],
      },
    },
  });
  return !!existingOrder;
}

export function fetchOrderByIdWithTicket(id: string): Promise<OrderWithTicket | null> {
  return db.order.findUnique({
    where: { id },
    include: {
      ticket: true,
    }
  });
}

export function fetchOrdersByUserIdWithTicket(userId: string): Promise<OrderWithTicket[] | null> {
  return db.order.findMany({
    where: { userId },
    include: {
      ticket: true,
    }
  });
}

export async function createOrder(
  data: Prisma.OrderUncheckedCreateInput,
  tx?: Prisma.TransactionClient
): Promise<OrderWithTicket> {
  const client = tx ?? db;

  return client.order.create({
    data: {
      ...data,
      status: data.status ?? OrderStatus.created,
    },
    include: {
      ticket: true,
    },
  });
}

export async function updateOrderWithVersion({
  id,
  version,
  data,
}: {
  id: string;
  version: number;
  data: Partial<Order>;
}, tx?: Prisma.TransactionClient ): Promise<OrderWithTicket | null> {
  const client = tx ?? db;

  const updated = await client.order.updateMany({
    where: { id, version },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    throw new Error('Optimistic concurrency conflict');
  }

  return client.order.findUnique({
    where: {id},
    include: {ticket: true},
  });
}

export async function updateOrderFromEvent(
eventId: string,
{
  id,
  version,
  data,
}: {
  id: string;
  version: number;
  data: Partial<Order>;
}): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.processedEvent.create({
      data: {
        eventId,
        topic: Topics.PaymentCreated,
      },
    });

    const result = await tx.order.updateMany({
      where: { id, version },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new Error(`Out-of-order or missing version id=${id}, v=${version}`);
    }
  });
}
