import { StartedPostgreSqlContainer, PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

jest.setTimeout(120000);
jest.mock('../kafka-client');

let container: StartedPostgreSqlContainer;
let db: PrismaClient;

beforeAll(async () => {
  process.env.JWT_KEY = 'sdf';

  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  let urlConnection = container.getConnectionUri();
  urlConnection = urlConnection.replace('postgres://', 'postgresql://');
  process.env.DATABASE_URL = urlConnection;

  try {
    execSync('npx prisma migrate deploy', { env: process.env, stdio: 'inherit' });
  } catch (err) {
    execSync('npx prisma db push --accept-data-loss', { env: process.env, stdio: 'inherit' });
  }

  const { db: prisma } = await import('../db');
  db = prisma;

  await db.$connect();
});

beforeEach(async () => {
  jest.clearAllMocks();

  const tableRows = await db.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tableRows
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
});

afterAll(async () => {
  if (db) {
    await db.$disconnect();
  }
  if (container) {
    await container.stop();
  }
});

export { db };
