import mongoose from 'mongoose';
import { Outbox, OutboxDoc } from '../../models/outbox';
import { EventMap, Topics } from '@aitickets123654/common-kafka';
import { TicketCreatedPublisher } from '../publishers/ticket-created-publisher';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';
import { DLQPublisher } from '../publishers/dlq-publisher'

const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 100);
const CONCURRENCY = Number(process.env.OUTBOX_CONCURRENCY || 10);
const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS || 8);
const BACKOFF_BASE_MS = Number(process.env.OUTBOX_BACKOFF_BASE_MS || 200);
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 500);

export const publishers: Partial<{
  [K in keyof EventMap]: new () => {
    publish(data: EventMap[K]["data"]): Promise<void>;
  };
}> = {
  TicketCreated: TicketCreatedPublisher,
  TicketUpdated: TicketUpdatedPublisher
};

// DLQ model
const DLQ_COLLECTION = 'outbox_dlq';

// Helper: chunk array
function chunkArray<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export async function claimBatch(): Promise<OutboxDoc<keyof EventMap>[]> {
  const claimed: OutboxDoc<keyof EventMap>[] = [];

  for (let i = 0; i < BATCH_SIZE; i++) {
    const doc = await Outbox.findOneAndUpdate(
      {
        status: 'pending',
        availableAt: { $lte: new Date() },
      },
      {
        $set: {
          status: 'processing',
          processingAt: new Date(),
        },
      },
      {
        sort: { createdAt: 1 },
        returnDocument: 'after',
      }
    ).exec() as unknown as OutboxDoc<keyof EventMap> | null;

    if (!doc) break;

    claimed.push(doc);
  }

  return claimed;
}

function computeBackoff(attempts: number) {
  const next = Math.min(attempts, 20);
  return Date.now() + Math.pow(2, next) * BACKOFF_BASE_MS;
}

async function handleFailure(event: OutboxDoc<keyof EventMap>, err: any) {
  const nextAttempts = (event.attempts || 0) + 1;
  const update: any = {
    attempts: nextAttempts,
    availableAt: new Date(computeBackoff(nextAttempts)),
    status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
  };

  await Outbox.updateOne({ _id: event._id }, { $set: update }).exec();

  // if moved to failed -> send to DLQ topic and copy to DLQ collection for later inspection
  if (nextAttempts >= MAX_ATTEMPTS) {
    function isTopicKey(key: string): key is keyof typeof Topics {
      return key in Topics;
    }

    let dlqTopic: Topics;
    let dlqEventType = `${event.eventType}DLQ`

    if (isTopicKey(dlqEventType)) {
      dlqTopic = Topics[dlqEventType];
    } else {
      throw Error('No DLQ topic found');
    }

    const dlqPublisher = new DLQPublisher<typeof event.payload>(dlqTopic);
    await dlqPublisher.publish({
      ...event.payload,
      error: String(err?.message || err),
      attempts: nextAttempts,
      failedAt: new Date().toISOString(),
    });
    console.error(`Event sent to DLQ topic: ${event._id}`, err);

    const dlqDoc = {
      outboxId: event._id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload,
      error: String(err?.message || err),
      attempts: nextAttempts,
      failedAt: new Date(),
    };
    await mongoose.connection.collection(DLQ_COLLECTION).insertOne(dlqDoc);
    console.error(`Event sent to DLQ collection: outboxId=${String(event._id)}`, err);
  } else {
    console.warn(
      `Event processing failed, will retry later: outboxId=${String(event._id)}, attempts=${nextAttempts}`
    );
  }
}

export async function processEventTyped<T extends keyof EventMap>(event: OutboxDoc<T>) {
  const eventType = event.eventType;

  const PublisherClass = publishers[eventType] as
    | (new () => { publish(data: EventMap[T]['data']): Promise<void> })
    | undefined;
  if (!PublisherClass) throw new Error(`Unknown eventType: ${eventType}`);

  const publisher = new PublisherClass();
  await publisher.publish(event.payload);

  // for testing fail publishing message
  // throw new Error('Force DLQ for testing');

  await Outbox.updateOne(
    { _id: event._id },
    {
      $set: {
        status: 'published',
        publishedAt: new Date()
      }
    }
  ).exec();
}

// process claimed batch with limited concurrency
async function processClaimedBatch(claimed: any[]) {
  const chunks = chunkArray(claimed, CONCURRENCY);
  for (const c of chunks) {
    const promises = c.map(async (evt) => {
      try {
        await processEventTyped(evt);
      } catch (err) {
        await handleFailure(evt, err);
      }
    });
    // await the chunk
    await Promise.all(promises);
  }
}

let stopped = false;
let polling = false;
export async function runOutboxWorkerOnce() {
  if (polling) return;
  polling = true;
  try {
    const claimed = await claimBatch();
    if (!claimed.length) return;
    await processClaimedBatch(claimed as any[]);
  } finally {
    polling = false;
  }
}

let intervalHandle: NodeJS.Timeout | null = null;
export function startOutboxWorker() {
  if (intervalHandle) return;
  console.info('Starting outbox worker...');
  intervalHandle = setInterval(() => {
    if (stopped) return;
    runOutboxWorkerOnce().catch((err) => console.error('Outbox worker error:', err));
  }, POLL_INTERVAL_MS);
  // kick off immediately
  runOutboxWorkerOnce().catch((err) => console.error('Outbox worker error:', err));
}

export async function stopOutboxWorker() {
  stopped = true;
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  // wait until current polling finishes
  while (polling) {
    await new Promise((r) => setTimeout(r, 50));
  }
  console.info('Outbox worker stopped');
}
