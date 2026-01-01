import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import {
  requireAuth,
  validateRequest,
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
} from '@aitickets123654/common-kafka';
import { stripe } from '../stripe';
import { Order, OrderDoc } from '../models/order';
import { Payment } from '../models/payment';
import { Outbox } from '../models/outbox';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const router = express.Router();

router.post(
  '/api/payments',
  requireAuth,
  [body('token').not().isEmpty(), body('orderId').not().isEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { token, orderId } = req.body;

      const order = await Order.findById(orderId) as OrderDoc;

      if (!order) {
        throw new NotFoundError();
      }
      if (order.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError();
      }
      if (order.status === 'cancelled') {
        throw new BadRequestError('Cannot pay for an cancelled order');
      }

      const charge = await stripe.charges.create({
        currency: 'usd',
        amount: order.price * 100,
        source: token,
      });

      const payment = Payment.build({
        orderId,
        stripeId: charge.id,
      });
      await payment.save({ session });

      await Outbox.build(
        {
          eventId: randomUUID(),
          aggregateType: 'payment',
          aggregateId: payment.id,
          eventType: 'PaymentCreated',
          payload: {
            id: payment.id,
            orderId: payment.orderId,
            stripeId: payment.stripeId,
          },
        },
      ).save({ session });

      await session.commitTransaction();
      await session.endSession();

      res.status(201).send({ id: payment.id });
    } catch(err) {
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  }
);

export { router as createChargeRouter };
