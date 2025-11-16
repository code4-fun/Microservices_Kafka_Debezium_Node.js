import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.mock('../kafka-client');

let mongo: any;
beforeAll(async () => {
  process.env.JWT_KEY = 'sdf';

  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);
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
