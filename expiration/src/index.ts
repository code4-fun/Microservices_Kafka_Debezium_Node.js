import { kafkaClient } from './kafka-client';
import { OrderCreatedListener } from './events/listeners/order-created-listener';

const start = async () => {
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
  } catch (err) {
    console.error(err);
  }
};

start();
