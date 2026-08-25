import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('[db] DATABASE_URL is not set. Set it in Railway → app service → Variables as:\n  DATABASE_URL = ${{Postgres.DATABASE_URL}}');
  process.exit(1);
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false,
});

let trgmReady = false;

/**
 * Whether pg_trgm is available, which decides if the bot's item search can do
 * fuzzy (typo-tolerant) matching or has to fall back to plain substring.
 * Settled by runMigrations() at boot, long before the bot starts polling.
 */
export function hasTrigrams(): boolean {
  return trgmReady;
}

export async function runMigrations(): Promise<void> {
  const sql = readFileSync(resolve(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  await enableTrigrams();
}

/**
 * pg_trgm powers the bot's "did you mean" search. It lives outside schema.sql on
 * purpose: that file is sent as a single query, so a role without permission to
 * create extensions would abort the whole migration and the app would not boot.
 * The indexes are in here too — gin_trgm_ops does not exist without the extension.
 */
async function enableTrigrams(): Promise<void> {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await pool.query('CREATE INDEX IF NOT EXISTS items_name_trgm ON items USING gin (name gin_trgm_ops)');
    await pool.query('CREATE INDEX IF NOT EXISTS catalog_name_trgm ON item_catalog USING gin (name gin_trgm_ops)');
    trgmReady = true;
    console.log('[db] pg_trgm enabled — fuzzy item search active');
  } catch (e) {
    trgmReady = false;
    console.warn('[db] pg_trgm unavailable, item search falls back to substring only:', (e as Error).message);
  }
}
