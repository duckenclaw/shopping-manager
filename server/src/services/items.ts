import type { PoolClient } from 'pg';
import { hasTrigrams, pool } from '../db.js';
import { PREDEFINED_TAGS, randomCategoryColor, SHARED_USER_ID } from '../constants.js';

export interface ItemRow {
  id: number;
  name: string;
  tag: string | null;
  is_checked: boolean;
  amount: number;
  created_at: string;
}

export interface SimilarMatch {
  name: string;
  tag: string | null;
  /** 'list' — already on the active shopping list; 'catalog' — added at some point before. */
  source: 'list' | 'catalog';
}

/**
 * Trigram score above which two names count as "similar enough" to offer.
 * Calibrated against a seeded Russian catalog: 0.6 rejected ordinary one-letter
 * typos ("хлеп"/"Хлеб" scores 0.60, "смтана"/"Сметана" 0.50), while 0.4 catches
 * those and produces almost no junk — the few extra hits it does surface, like
 * "Сыр Бри" pulling up the other cheeses, are exactly what this feature is for.
 * Erring low is the right bias: a spurious option costs one extra tap, a missed
 * one silently creates the duplicate this whole flow exists to prevent.
 */
const FUZZY_THRESHOLD = 0.4;

/** Most similar names to offer at once. Telegram keyboards get unwieldy past this. */
const MAX_MATCHES = 6;

/**
 * Add an item on behalf of any caller (HTTP route or bot). The caller owns the
 * transaction, so a failure anywhere rolls back the catalog and category writes too.
 *
 * Adding something already on the list bumps its amount instead of duplicating the row.
 * Names match exactly, like item_catalog's unique key — lower() would fold Cyrillic only
 * under some DB locales, so a case-insensitive match here could disagree with the client.
 * Lowest id first, so any pre-existing duplicates grow one canonical row.
 */
export async function addItem(
  client: PoolClient,
  { name, tag, amount = 1 }: { name: string; tag: string | null; amount?: number },
): Promise<ItemRow> {
  const bumped = await client.query<ItemRow>(
    `UPDATE items SET amount = amount + $3, tag = COALESCE(tag, $4)
     WHERE id = (
       SELECT id FROM items
       WHERE user_id = $1 AND name = $2
       ORDER BY id LIMIT 1
     )
     RETURNING id, name, tag, is_checked, amount, created_at`,
    [SHARED_USER_ID, name, amount, tag],
  );
  const rows = bumped.rowCount
    ? bumped.rows
    : (await client.query<ItemRow>(
        `INSERT INTO items (user_id, name, tag, amount)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, tag, is_checked, amount, created_at`,
        [SHARED_USER_ID, name, tag, amount],
      )).rows;
  await client.query(
    `INSERT INTO item_catalog (user_id, name, tag, last_used_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, name)
     DO UPDATE SET tag = COALESCE(EXCLUDED.tag, item_catalog.tag), last_used_at = now()`,
    [SHARED_USER_ID, name, tag],
  );
  if (tag && !PREDEFINED_TAGS.includes(tag)) {
    await client.query(
      `INSERT INTO categories (user_id, name, color)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO NOTHING`,
      [SHARED_USER_ID, tag, randomCategoryColor()],
    );
  }
  return rows[0];
}

/** Escape LIKE wildcards so a name containing % or _ searches literally. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Names resembling `query`, current list first so a pick bumps an existing row
 * rather than adding another. Substring always; word_similarity additionally
 * catches typos ("малако" → "Молоко") when pg_trgm is installed. word_similarity
 * scores the query against the best-matching word span inside the name, so a
 * short query like "сыр" ranks high against "Сыр Чеддер" — plain similarity()
 * would penalise it for the length difference.
 */
export async function findSimilar(query: string): Promise<SimilarMatch[]> {
  const fuzzy = hasTrigrams();
  // Parameters are built alongside the SQL: an unreferenced placeholder makes
  // Postgres fail with "could not determine data type", so the fuzzy-only $3
  // is appended only when the fuzzy branch actually uses it.
  const params: unknown[] = [SHARED_USER_ID, likePattern(query)];
  let predicate = 'name ILIKE $2';
  let score = '0';
  if (fuzzy) {
    params.push(query);
    predicate = `(name ILIKE $2 OR word_similarity($3, name) > ${FUZZY_THRESHOLD})`;
    score = 'GREATEST(similarity(name, $3), word_similarity($3, name))';
  }

  const { rows } = await pool.query<SimilarMatch & { score: number }>(
    `SELECT name, tag, source, score FROM (
       SELECT name, tag, 'list' AS source, ${score} AS score
         FROM items WHERE user_id = $1 AND ${predicate}
       UNION ALL
       SELECT name, tag, 'catalog' AS source, ${score} AS score
         FROM item_catalog WHERE user_id = $1 AND ${predicate}
     ) m
     ORDER BY (source = 'list') DESC, score DESC, name`,
    params,
  );

  // The same name can be both on the list and in the catalog; keep the list row,
  // which the ORDER BY already put first.
  const seen = new Set<string>();
  const unique: SimilarMatch[] = [];
  for (const r of rows) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ name: r.name, tag: r.tag, source: r.source });
    if (unique.length === MAX_MATCHES) break;
  }
  return unique;
}

/** Every category that can be offered: the predefined ones first, then custom ones A-Z. */
export async function listCategories(): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    'SELECT name FROM categories WHERE user_id = $1',
    [SHARED_USER_ID],
  );
  const custom = rows
    .map((r) => r.name)
    .filter((n) => !PREDEFINED_TAGS.includes(n))
    .sort((a, b) => a.localeCompare(b, 'ru'));
  return [...PREDEFINED_TAGS, ...custom];
}
