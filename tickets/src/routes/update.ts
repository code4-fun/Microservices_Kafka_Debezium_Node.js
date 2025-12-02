import express, { Request, Response } from 'express';
import {
  NotAuthorizedError,
  NotFoundError,
  BadRequestError,
  requireAuth,
  validateRequest
} from '@aitickets123654/common-kafka';
import { Ticket, TicketDoc } from '../models/ticket';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { createOutboxEvent } from '../events/workers/create-outbox-event';

const router = express.Router();

router.put(
  '/api/tickets/:id',
  requireAuth,
  [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be provided and must be greater than 0'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const ticket = await Ticket.findById(req.params.id) as TicketDoc;

      if (!ticket) {
        throw new NotFoundError();
      }

      if (ticket.orderId) {
        throw new BadRequestError('Cannot edit a reserved ticket');
      }

      if (ticket.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError();
      }

      ticket.set({
        title: req.body.title,
        price: req.body.price,
      });
      await ticket.save({ session });

      await createOutboxEvent({
        aggregateType: 'ticket',
        aggregateId: ticket.id,
        eventType: 'TicketUpdated',
        payload: {
          id: ticket.id,
          title: ticket.title,
          price: ticket.price,
          userId: ticket.userId,
          orderId: ticket.orderId || null,
          version: ticket.version,
        },
        session,
      });

      await session.commitTransaction();
      await session.endSession();

      res.send(ticket);
    } catch (err) {
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  }
);

export { router as updateTicketRouter };
