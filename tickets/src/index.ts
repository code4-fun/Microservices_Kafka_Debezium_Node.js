import mongoose from 'mongoose';
import { app } from './app';
import { kafkaClient } from './kafka-client'
import { OrderCreatedListener } from './events/listeners/order-created-listener';
import { OrderCancelledListener } from './events/listeners/order-cancelled-listener';

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error('JWT_KEY must be defined');
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined');
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
    })

    process.on('SIGINT', async () => {
      await kafkaClient.disconnect();
      process.exit();
    });
    process.on('SIGTERM', async () => {
      await kafkaClient.disconnect();
      process.exit();
    });

    await new OrderCreatedListener().listen();
    await new OrderCancelledListener().listen();

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDb');
  } catch (err) {
    console.error(err);
  }

  app.listen(3000, () => {
    console.log('Tickets listening on port 3000!!!');
  });
};

start();
