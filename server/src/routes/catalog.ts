import { Router } from 'express';
import { pool } from '../db.js';

export const catalogRouter = Router();

catalogRouter.get('/', async (req, res) => {
  const userId = res.locals.user!.id;
  const q = String(req.query.q ?? '').trim();
  if (q) {
    const { rows } = await pool.query(
      `SELECT id, name, tag FROM item_catalog
       WHERE user_id = $1 AND name ILIKE $2
       ORDER BY last_used_at DESC LIMIT 25`,
      [userId, `%${q}%`],
    );
    res.json(rows);
    return;
  }
  const { rows } = await pool.query(
    `SELECT id, name, tag FROM item_catalog
     WHERE user_id = $1 ORDER BY last_used_at DESC LIMIT 25`,
    [userId],
  );
  res.json(rows);
});
