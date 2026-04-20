import { Router } from 'express';
import { pool } from '../db.js';

export const placesRouter = Router();

placesRouter.get('/', async (_req, res) => {
  const userId = res.locals.user!.id;
  const { rows } = await pool.query(
    'SELECT id, name, created_at FROM places WHERE user_id = $1 ORDER BY name ASC',
    [userId],
  );
  res.json(rows);
});

placesRouter.post('/', async (req, res) => {
  const userId = res.locals.user!.id;
  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO places (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, created_at',
      [userId, name],
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'db error' });
  }
});

placesRouter.delete('/:id', async (req, res) => {
  const userId = res.locals.user!.id;
  const id = Number(req.params.id);
  await pool.query('DELETE FROM places WHERE id = $1 AND user_id = $2', [id, userId]);
  res.json({ ok: true });
});
