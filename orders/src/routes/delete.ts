import express, { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import { fetchOrderByIdWithTicket, updateOrderWithVersion } from '../services/orders.service';
import { requireAuth, NotFoundError, NotAuthorizedError } from '@aitickets123654/common-kafka';
import { OrderCancelledPublisher } from '../events/publishers/order-cancelled-publisher';

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

  await updateOrderWithVersion({
    id: orderId,
    version: order.version,
    data: {
      status: OrderStatus.cancelled
    }
  });

  await new OrderCancelledPublisher().publish({
    id: order.id,
    ticket: {
      id: order.ticketId,
    },
    version: order.version,
  });

  res.status(204).send(order);
});

export { router as deleteOrderRouter };
