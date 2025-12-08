import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../app';
import { Order } from '../../models/order';
import { signin } from '../../test/test-utils';
import { stripe } from '../../stripe';
import { Payment, PaymentDoc } from '../../models/payment';
import { Outbox } from '../../models/outbox';

const mockPublish = jest.fn().mockResolvedValue(undefined);
jest.mock('../../events/publishers/payment-created-publisher', () => ({
  PaymentCreatedPublisher: jest.fn().mockImplementation(() => ({
    publish: mockPublish,
  })),
}));

it('returns a 404 when purchasing an order that does not exist', async () => {
  await request(app)
    .post('/api/payments')
    .set('Cookie', signin())
    .send({
      token: 'sdf',
      orderId: new mongoose.Types.ObjectId().toHexString(),
    })
    .expect(404);
});

it('returns a 401 when purchasing an order that doesnt belong to the user', async () => {
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    price: 20,
    status: 'created',
  });
  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', signin())
    .send({
      token: 'sdf',
      orderId: order.id,
    })
    .expect(401);
});

it('returns a 400 when purchasing a cancelled order', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 20,
    status: 'cancelled',
  });
  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', signin(userId))
    .send({
      orderId: order.id,
      token: 'sdf',
    })
    .expect(400);
});

it('returns a 201 with valid inputs', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 20,
    status: 'created',
  });
  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', signin(userId))
    .send({
      token: 'tok_visa',
      orderId: order.id,
    })
    .expect(201);

  const chargeOptions = (stripe.charges.create as jest.Mock).mock.calls[0][0];
  expect(chargeOptions.source).toEqual('tok_visa');
  expect(chargeOptions.amount).toEqual(20 * 100);
  expect(chargeOptions.currency).toEqual('usd');

  const payment = await Payment.findOne({
    orderId: order.id,
  }) as PaymentDoc;
  expect(payment).not.toBeNull();
  expect(payment!.stripeId).toEqual('test_stripe_charge_id');
});

it('creates an outbox event for payment creation', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 20,
    status: 'created',
  });
  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', signin(userId))
    .send({
      token: 'sdf',
      orderId: order.id,
    })
    .expect(201);

  const payments = await Payment.find({ orderId: order.id });
  expect(payments).toHaveLength(1);

  const payment = payments[0];
  const outboxRecords = await Outbox.find({
    aggregateId: payment.id,
    eventType: 'PaymentCreated'
  });
  expect(outboxRecords).toHaveLength(1);
});

it('should publish PaymentCreated events from outbox', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 20,
    status: 'created',
  });
  await order.save();

  const response = await request(app)
    .post('/api/payments')
    .set('Cookie', signin(userId))
    .send({
      token: 'sdf',
      orderId: order.id,
    })
    .expect(201);


  const payment = await Payment.findById(response.body.id) as PaymentDoc;
  expect(payment).not.toBeNull();

  await Outbox.create({
    aggregateType: 'payment',
    aggregateId: payment.id,
    eventType: 'PaymentCreated',
    payload: {
      id: payment.id,
      orderId: order.id,
      stripeId: payment.stripeId,
    },
    status: 'pending',
  });

  // запускаем worker один раз
  const { runOutboxWorkerOnce } = require('../../events/workers/outbox-worker');
  await runOutboxWorkerOnce();

  // проверяем, что publisher был вызван с правильными данными
  expect(mockPublish).toHaveBeenCalledWith({
    id: payment.id,
    orderId: order.id,
    stripeId: payment.stripeId,
  });

  // проверяем, что статус outbox записи обновлен
  const outboxRecord = await Outbox.findOne({ aggregateId: payment.id });
  expect(outboxRecord!.status).toBe('published');
});
