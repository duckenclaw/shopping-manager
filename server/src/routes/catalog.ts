import { Router } from 'express';
import { pool } from '../db.js';
import { SHARED_USER_ID } from '../constants.js';

export const catalogRouter = Router();

catalogRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q) {
    const { rows } = await pool.query(
      `SELECT id, name, tag FROM item_catalog
       WHERE user_id = $1 AND name ILIKE $2
       ORDER BY last_used_at DESC LIMIT 25`,
      [SHARED_USER_ID, `%${q}%`],
    );
    res.json(rows);
    return;
  }
  const { rows } = await pool.query(
    `SELECT id, name, tag FROM item_catalog
     WHERE user_id = $1 ORDER BY last_used_at DESC LIMIT 25`,
    [SHARED_USER_ID],
  );
  res.json(rows);
});

catalogRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await pool.query(
    'DELETE FROM item_catalog WHERE id = $1 AND user_id = $2',
    [id, SHARED_USER_ID],
  );
  res.json({ ok: true });
});
