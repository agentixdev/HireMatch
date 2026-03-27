import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as relations from './relations';

export function createDb(databaseUrl?: string) {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const sql = neon(url);
  return drizzle(sql, {
    schema: { ...schema, ...relations },
  });
}

export type Database = ReturnType<typeof createDb>;

// Re-export everything
export * from './schema';
export * from './relations';
