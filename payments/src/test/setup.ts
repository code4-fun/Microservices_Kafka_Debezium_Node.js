// фильтруем ECONNRESET от mongod
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args?.[0]?.toString?.() || "";
  if (msg.includes("ECONNRESET")) return;
  originalWarn(...args);
};

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.mock('../kafka-client');
jest.mock('../stripe');

let mongo: any;
beforeAll(async () => {
  process.env.JWT_KEY = 'sdf';

  mongo = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger'
    },
  });

  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);

  // waitUntilRunning() ломает тесты → используем таймер
  await new Promise(resolve => setTimeout(resolve, 1000));
});

beforeEach(async () => {
  jest.clearAllMocks();

  const db = mongoose.connection.db;
  if (!db) return;

  const collections = await db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});
