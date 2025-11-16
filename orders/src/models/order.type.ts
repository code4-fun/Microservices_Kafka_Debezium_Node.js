import { Prisma } from '@prisma/client';

export type OrderWithTicket = Prisma.OrderGetPayload<{
  include: { ticket: true }
}>;
