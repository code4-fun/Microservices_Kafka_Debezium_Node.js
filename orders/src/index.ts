import { app } from './app';
import { kafkaClient } from './kafka-client';
import { db } from './db';
import { TicketCreatedListener } from './events/listeners/ticket-created-listener';
import { TicketUpdatedListener } from './events/listeners/ticket-updated-listener';
import { ExpirationCompleteListener } from './events/listeners/expiration-complete-listener';
import { PaymentCreatedListener } from './events/listeners/payment-created-listener';

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error('JWT_KEY must be defined');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined');
  }

  if (!process.env.KAFKA_CLIENT_ID) {
    throw new Error('KAFKA_CLIENT_ID must be defined');
  }

  if (!process.env.KAFKA_URL) {
    throw new Error('KAFKA_URL must be defined');
  }

  try {
    await kafkaClient.connect({
      clientId: process.env.KAFKA_CLIENT_ID,
      brokers: [process.env.KAFKA_URL],
    });

    process.on('SIGINT', async () => {
      await kafkaClient.disconnect();
      process.exit();
    });
    process.on('SIGTERM', async () => {
      await kafkaClient.disconnect();
      process.exit();
    });

    await new TicketCreatedListener().listen();
    await new TicketUpdatedListener().listen();
    await new ExpirationCompleteListener().listen();
    await new PaymentCreatedListener().listen();

    await db.$connect();
    console.log('Orders connected to PostgreSQL');
  } catch (err) {
    console.error(err);
  }

  app.listen(3000, () => {
    console.log('Orders listening on port 3000!!!');
  });
};

start();
