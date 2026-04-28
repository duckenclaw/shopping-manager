import { Router } from 'express';
import { pool } from '../db.js';
import { SHARED_USER_ID } from '../constants.js';

export const placesRouter = Router();

placesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, created_at FROM places WHERE user_id = $1 ORDER BY name ASC',
    [SHARED_USER_ID],
  );
  res.json(rows);
});

placesRouter.post('/', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO places (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, created_at',
      [SHARED_USER_ID, name],
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'db error' });
  }
});

placesRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await pool.query('DELETE FROM places WHERE id = $1 AND user_id = $2', [id, SHARED_USER_ID]);
  res.json({ ok: true });
});
