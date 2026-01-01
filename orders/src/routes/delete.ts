import express, { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import { fetchOrderByIdWithTicket, updateOrderWithVersion } from '../services/orders.service';
import { requireAuth, NotFoundError, NotAuthorizedError } from '@aitickets123654/common-kafka';
import { Prisma } from '@prisma/client';
import { db } from '../db';
import { randomUUID } from 'crypto';

const router = express.Router();

router.delete('/api/orders/:orderId', requireAuth, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const order = await fetchOrderByIdWithTicket(orderId);

  if (!order) {
    throw new NotFoundError();
  }

  if (order.status === OrderStatus.cancelled) {
    return res.status(204).send(order);
  }

  if (order.userId !== req.currentUser!.id) {
    throw new NotAuthorizedError();
  }

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updatedOrder = await updateOrderWithVersion({
      id: orderId,
      version: order.version,
      data: {
        status: OrderStatus.cancelled
      },
    }, tx);

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    await tx.outbox.create({
      data: {
        eventId: randomUUID(),
        aggregatetype: 'order',
        aggregateid: updatedOrder.id,
        type: 'orders.order.cancelled.v1',
        payload: {
          id: updatedOrder.id,
          ticket: {
            id: updatedOrder.ticketId,
          },
          version: updatedOrder.version,
        },
      },
    });

    return updatedOrder;
  });

  res.status(204).send(result);
});

export { router as deleteOrderRouter };
