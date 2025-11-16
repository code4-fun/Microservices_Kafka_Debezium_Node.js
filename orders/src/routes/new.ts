import express, { Request, Response } from 'express';
import {
  requireAuth,
  validateRequest,
  NotFoundError,
  BadRequestError,
} from '@aitickets123654/common-kafka';
import { body } from 'express-validator';
import { createOrder, isTicketReserved } from '../services/orders.service';
import { fetchTicketById } from '../services/tickets.service';
import { OrderCreatedPublisher } from '../events/publishers/order-created-publisher';
import { OrderStatus } from '@prisma/client';

const router = express.Router();

const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post(
  '/api/orders',
  requireAuth,
  [
    body('ticketId')
      .not()
      .isEmpty()
      .withMessage('TicketId must be provided'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { ticketId } = req.body;

    const ticket = await fetchTicketById(ticketId);

    if (!ticket) {
      throw new NotFoundError();
    }

    const isReserved = await isTicketReserved(ticketId);
    if (isReserved) {
      throw new BadRequestError('Ticket is already reserved');
    }

    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS);

    const order = await createOrder({
      userId: req.currentUser!.id,
      status: OrderStatus.created,
      expiresAt: expiration,
      ticketId: ticket.id,
      version: 0,
    });

    await new OrderCreatedPublisher().publish({
      id: order.id,
      status: order.status,
      userId: order.userId,
      expiresAt: order.expiresAt.toISOString(),
      ticket: {
        id: ticket.id,
        price: ticket.price,
      },
      version: order.version,
    });

    res.status(201).send(order);
});

export { router as newOrderRouter };
