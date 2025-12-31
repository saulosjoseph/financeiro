import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Create two separate clients:
// 1. For raw SQL queries (with prepare: false for transaction pooling)
export const client = postgres(connectionString, { 
  prepare: false,
});

// 2. For Drizzle ORM adapter (without prepare: false to avoid PostgreSQL config errors)
const authClient = postgres(connectionString, {
  max: 1, // Limit connections for auth
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(client, { schema });
export const authDb = drizzle(authClient, { schema });

// Export SQL client for raw queries
export { sql } from 'drizzle-orm';
export type DB = typeof db;
