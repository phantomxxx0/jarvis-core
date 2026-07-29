import dotenv from 'dotenv';
import path from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Always load the repository root .env
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL is not defined. Expected .env at: ${path.resolve(
      __dirname,
      '../../../.env',
    )}`,
  );
}

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
});

export const db = drizzle(client);

export { client };
