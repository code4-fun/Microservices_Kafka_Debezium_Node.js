import express, { Request, Response } from 'express';
import { requireAuth } from '@aitickets123654/common-kafka';
import { fetchOrdersByUserIdWithTicket } from '../services/orders.service';

const router = express.Router();

router.get('/api/orders', requireAuth, async (req: Request, res: Response) => {
  const orders = await fetchOrdersByUserIdWithTicket(req.currentUser!.id);
  res.send(orders);
});

export { router as indexOrderRouter };
