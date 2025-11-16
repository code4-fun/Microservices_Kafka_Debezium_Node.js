import express, { Request, Response } from 'express';
import { requireAuth, NotFoundError,NotAuthorizedError } from '@aitickets123654/common-kafka';
import { fetchOrderByIdWithTicket } from '../services/orders.service';

const router = express.Router();

router.get('/api/orders/:orderId', requireAuth, async (req: Request, res: Response) => {
  const order = await fetchOrderByIdWithTicket(req.params.orderId);

  if (!order) {
    throw new NotFoundError();
  }

  if (order.userId !== req.currentUser!.id) {
    throw new NotAuthorizedError();
  }

  res.send(order);
});

export { router as showOrderRouter };
