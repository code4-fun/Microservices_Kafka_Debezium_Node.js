import Queue from 'bull';
import { ExpirationCompletePublisher } from '../events/publishers/expiration-complete-publisher';
import { randomUUID } from 'crypto';

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>('order:expiration', {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueue.process(async (job) => {
  await new ExpirationCompletePublisher().publish(
    {
      orderId: job.data.orderId,
    },
    {
      eventId: randomUUID(),
    }
  );
});

export { expirationQueue };
