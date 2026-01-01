import { db } from '../db';
import { Prisma, Ticket } from '@prisma/client';
import { Topics } from '@aitickets123654/common-kafka';

export function fetchTicketById(id: string): Promise<Ticket | null> {
  return db.ticket.findUnique({
    where: { id }
  });
}

export async function createTicket(
  data: Prisma.TicketUncheckedCreateInput
): Promise<Ticket> {
  if (data.id) {
    return db.ticket.upsert({
      where: { id: data.id },
      update: {},
      create: data,
    });
  }

  return db.ticket.create({
    data,
  });
}

export async function createTicketFromEvent(
  eventId: string,
  data: Prisma.TicketUncheckedCreateInput
) {
  return db.$transaction(async (tx) => {
    await tx.processedEvent.create({
      data: {
        eventId,
        topic: Topics.TicketCreated,
      },
    });

    await tx.ticket.create({
      data,
    });
  });
}

export async function updateTicketByVersion({ id, version, data }: {
  id: string,
  version: number,
  data: Prisma.TicketUncheckedUpdateInput
}): Promise<Ticket | null> {
  const updated = await db.ticket.updateMany({
    where: {
      id,
      version: version - 1,
    },
    data: {
      ...data,
      version,
    },
  });

  if (updated.count === 0) {
    return null;
  }

  return db.ticket.findUnique({ where: { id } });
}

export async function updateTicketFromEvent(
  eventId: string,
  {
    id,
    version,
    data,
  }: {
    id: string;
    version: number;
    data: Prisma.TicketUncheckedUpdateInput;
  }
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.processedEvent.create({
      data: {
        eventId,
        topic: Topics.TicketUpdated,
      },
    });

    const result = await tx.ticket.updateMany({
      where: {
        id,
        version: version - 1,
      },
      data: {
        ...data,
        version,
      },
    });

    if (result.count === 0) {
      throw new Error(`Out-of-order or missing version id=${id}, v=${version}`);
    }
  });
}
