import { Topics, RawTopics } from '@aitickets123654/common-kafka';

export const OutboxEventMap = [
  {
    rawTopic: RawTopics.OrderCreatedRaw,
    targetTopic: Topics.OrderCreated,
  },
  {
    rawTopic: RawTopics.OrderCancelledRaw,
    targetTopic: Topics.OrderCancelled,
  },
];
