import { Router } from 'express';
import { pool } from '../db.js';
import { SHARED_USER_ID } from '../constants.js';

export const draftsRouter = Router();

function normalizeTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t || null;
}

draftsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.created_at,
            COALESCE(json_agg(json_build_object('id', di.id, 'name', di.name, 'tag', di.tag))
                     FILTER (WHERE di.id IS NOT NULL), '[]') AS items
     FROM drafts d
     LEFT JOIN draft_items di ON di.draft_id = d.id
     WHERE d.user_id = $1
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    [SHARED_USER_ID],
  );
  res.json(rows);
});

draftsRouter.post('/', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const { rows } = await pool.query(
    'INSERT INTO drafts (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
    [SHARED_USER_ID, name],
  );
  res.json({ ...rows[0], items: [] });
});

draftsRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await pool.query('DELETE FROM drafts WHERE id = $1 AND user_id = $2', [id, SHARED_USER_ID]);
  res.json({ ok: true });
});

draftsRouter.post('/:id/items', async (req, res) => {
  const draftId = Number(req.params.id);
  const name = String(req.body?.name ?? '').trim();
  const tag = normalizeTag(req.body?.tag);
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const owner = await pool.query('SELECT 1 FROM drafts WHERE id = $1 AND user_id = $2', [draftId, SHARED_USER_ID]);
  if (!owner.rowCount) {
    res.status(404).json({ error: 'draft not found' });
    return;
  }
  const { rows } = await pool.query(
    'INSERT INTO draft_items (draft_id, name, tag) VALUES ($1, $2, $3) RETURNING id, name, tag',
    [draftId, name, tag],
  );
  res.json(rows[0]);
});

draftsRouter.delete('/:draftId/items/:itemId', async (req, res) => {
  const draftId = Number(req.params.draftId);
  const itemId = Number(req.params.itemId);
  await pool.query(
    `DELETE FROM draft_items
     WHERE id = $1 AND draft_id IN (SELECT id FROM drafts WHERE id = $2 AND user_id = $3)`,
    [itemId, draftId, SHARED_USER_ID],
  );
  res.json({ ok: true });
});

draftsRouter.post('/:id/apply', async (req, res) => {
  const draftId = Number(req.params.id);
  const placeId = req.body?.placeId == null ? null : Number(req.body.placeId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const draft = await client.query('SELECT 1 FROM drafts WHERE id = $1 AND user_id = $2', [draftId, SHARED_USER_ID]);
    if (!draft.rowCount) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'draft not found' });
      return;
    }
    const inserted = await client.query(
      `INSERT INTO items (user_id, place_id, name, tag)
       SELECT $1, $2, di.name, di.tag FROM draft_items di WHERE di.draft_id = $3
       RETURNING id, name, tag`,
      [SHARED_USER_ID, placeId, draftId],
    );
    for (const row of inserted.rows) {
      await client.query(
        `INSERT INTO item_catalog (user_id, name, tag, last_used_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, name) DO UPDATE SET
           tag = COALESCE(EXCLUDED.tag, item_catalog.tag),
           last_used_at = now()`,
        [SHARED_USER_ID, row.name, row.tag],
      );
    }
    await client.query('COMMIT');
    res.json({ added: inserted.rowCount ?? 0 });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'db error' });
  } finally {
    client.release();
  }
});
