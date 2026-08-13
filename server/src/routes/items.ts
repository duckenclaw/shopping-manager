import { Router } from 'express';
import { pool } from '../db.js';
import { PREDEFINED_TAGS, randomCategoryColor, SHARED_USER_ID } from '../constants.js';

export const itemsRouter = Router();

function normalizeTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t || null;
}

itemsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT i.id, i.name, i.tag, i.is_checked, i.amount, i.created_at
     FROM items i
     WHERE i.user_id = $1
     ORDER BY i.tag NULLS LAST, i.name ASC`,
    [SHARED_USER_ID],
  );
  res.json(rows);
});

itemsRouter.post('/', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const tag = normalizeTag(req.body?.tag);
  const amount = Math.max(1, Number(req.body?.amount) || 1);
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO items (user_id, name, tag, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, tag, is_checked, amount, created_at`,
      [SHARED_USER_ID, name, tag, amount],
    );
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
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'db error' });
  } finally {
    client.release();
  }
});

itemsRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const isChecked = typeof req.body?.isChecked === 'boolean' ? req.body.isChecked : undefined;
  const amount = typeof req.body?.amount === 'number' ? Math.max(1, req.body.amount) : undefined;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (isChecked !== undefined) { vals.push(isChecked); sets.push(`is_checked = $${vals.length}`); }
  if (amount !== undefined) { vals.push(amount); sets.push(`amount = $${vals.length}`); }
  if (!sets.length) { res.json({ ok: true }); return; }
  vals.push(id); vals.push(SHARED_USER_ID);
  const { rows } = await pool.query(
    `UPDATE items SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND user_id = $${vals.length}
     RETURNING id, name, tag, is_checked, amount, created_at`,
    vals,
  );
  res.json(rows[0] ?? null);
});

// Discarding an item (swipe left) is not a purchase — deliberately no history row.
itemsRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await pool.query('DELETE FROM items WHERE id = $1 AND user_id = $2', [id, SHARED_USER_ID]);
  res.json({ ok: true });
});

// Completing items ("Готово") archives them into item_history, then removes them.
// Single statement, so it cannot half-apply.
itemsRouter.post('/complete', async (_req, res) => {
  const { rowCount } = await pool.query(
    `WITH done AS (
       DELETE FROM items
       WHERE user_id = $1 AND is_checked = true
       RETURNING name, tag, amount, created_at
     )
     INSERT INTO item_history (user_id, name, tag, amount, added_at)
     SELECT $1, name, tag, amount, created_at FROM done`,
    [SHARED_USER_ID],
  );
  res.json({ deleted: rowCount ?? 0 });
});
