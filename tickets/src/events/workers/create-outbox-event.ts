import { EventMap } from '@aitickets123654/common-kafka';
import { Outbox, OutboxDoc } from '../../models/outbox';
import { ClientSession } from 'mongoose';

export interface CreateOutboxEventParams<T extends keyof EventMap> {
  aggregateType: string;
  aggregateId: string;
  eventType: T;
  payload: EventMap[T]['data'];
  session: ClientSession;
}

export async function createOutboxEvent<T extends keyof EventMap>({
  aggregateType,
  aggregateId,
  eventType,
  payload,
  session,
}: CreateOutboxEventParams<T>): Promise<OutboxDoc> {
  const [doc] = await Outbox.create(
    [
      {
        aggregateType,
        aggregateId,
        eventType,
        payload,
      },
    ],
    { session }
  );

  return doc as unknown as Promise<OutboxDoc>;
}
