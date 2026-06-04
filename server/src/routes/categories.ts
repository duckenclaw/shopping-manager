import { Router } from 'express';
import { pool } from '../db.js';
import { PREDEFINED_TAGS, randomCategoryColor, SHARED_USER_ID } from '../constants.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT name, color FROM categories WHERE user_id = $1 ORDER BY name',
    [SHARED_USER_ID],
  );
  res.json(rows);
});

categoriesRouter.post('/', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const color = String(req.body?.color ?? '').trim() || randomCategoryColor();
  await pool.query(
    `INSERT INTO categories (user_id, name, color)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, name) DO NOTHING`,
    [SHARED_USER_ID, name, color],
  );
  const { rows } = await pool.query(
    'SELECT name, color FROM categories WHERE user_id = $1 AND name = $2',
    [SHARED_USER_ID, name],
  );
  res.json(rows[0] ?? { name, color });
});

/**
 * Backfill the categories table from any custom tags already present on items
 * and catalog entries, assigning each a random color. Idempotent.
 */
export async function backfillCategories(): Promise<void> {
  const { rows } = await pool.query<{ tag: string }>(
    `SELECT DISTINCT tag FROM (
       SELECT tag FROM items WHERE user_id = $1
       UNION
       SELECT tag FROM item_catalog WHERE user_id = $1
     ) t
     WHERE tag IS NOT NULL AND tag <> '' AND NOT (tag = ANY($2::text[]))`,
    [SHARED_USER_ID, PREDEFINED_TAGS],
  );
  for (const { tag } of rows) {
    await pool.query(
      `INSERT INTO categories (user_id, name, color)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO NOTHING`,
      [SHARED_USER_ID, tag, randomCategoryColor()],
    );
  }
}
