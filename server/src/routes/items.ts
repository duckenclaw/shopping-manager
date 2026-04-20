import { Router } from 'express';
import { pool } from '../db.js';

export const itemsRouter = Router();

const TAGS = ['Фрукты', 'Овощи', 'Мясо', 'Кондименты', 'Крупы', 'Молочка', 'Сладкое', 'Дом'];

function normalizeTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return TAGS.includes(t) ? t : null;
}

itemsRouter.get('/', async (_req, res) => {
  const userId = res.locals.user!.id;
  const { rows } = await pool.query(
    `SELECT i.id, i.name, i.tag, i.place_id, i.is_checked, i.created_at, p.name AS place_name
     FROM items i
     LEFT JOIN places p ON p.id = i.place_id
     WHERE i.user_id = $1
     ORDER BY i.tag NULLS LAST, i.name ASC`,
    [userId],
  );
  res.json(rows);
});

itemsRouter.post('/', async (req, res) => {
  const userId = res.locals.user!.id;
  const name = String(req.body?.name ?? '').trim();
  const tag = normalizeTag(req.body?.tag);
  const placeId = req.body?.placeId == null ? null : Number(req.body.placeId);
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO items (user_id, place_id, name, tag)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, tag, place_id, is_checked, created_at`,
      [userId, placeId, name, tag],
    );
    await client.query(
      `INSERT INTO item_catalog (user_id, name, tag, last_used_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, name)
       DO UPDATE SET tag = COALESCE(EXCLUDED.tag, item_catalog.tag), last_used_at = now()`,
      [userId, name, tag],
    );
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
  const userId = res.locals.user!.id;
  const id = Number(req.params.id);
  const placeId = req.body?.placeId === null ? null : req.body?.placeId != null ? Number(req.body.placeId) : undefined;
  const isChecked = typeof req.body?.isChecked === 'boolean' ? req.body.isChecked : undefined;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (placeId !== undefined) { vals.push(placeId); sets.push(`place_id = $${vals.length}`); }
  if (isChecked !== undefined) { vals.push(isChecked); sets.push(`is_checked = $${vals.length}`); }
  if (!sets.length) { res.json({ ok: true }); return; }
  vals.push(id); vals.push(userId);
  const { rows } = await pool.query(
    `UPDATE items SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND user_id = $${vals.length}
     RETURNING id, name, tag, place_id, is_checked, created_at`,
    vals,
  );
  res.json(rows[0] ?? null);
});

itemsRouter.delete('/:id', async (req, res) => {
  const userId = res.locals.user!.id;
  const id = Number(req.params.id);
  await pool.query('DELETE FROM items WHERE id = $1 AND user_id = $2', [id, userId]);
  res.json({ ok: true });
});

itemsRouter.post('/complete-trip', async (req, res) => {
  const userId = res.locals.user!.id;
  const placeId = Number(req.body?.placeId);
  if (!placeId) {
    res.status(400).json({ error: 'placeId required' });
    return;
  }
  const { rowCount } = await pool.query(
    'DELETE FROM items WHERE user_id = $1 AND place_id = $2 AND is_checked = true',
    [userId, placeId],
  );
  res.json({ deleted: rowCount ?? 0 });
});
