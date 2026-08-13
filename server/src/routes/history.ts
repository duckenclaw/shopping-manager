import { Router } from 'express';
import { pool } from '../db.js';
import { SHARED_USER_ID } from '../constants.js';

export const historyRouter = Router();

historyRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, tag, amount, added_at, completed_at
     FROM item_history
     WHERE user_id = $1
     ORDER BY completed_at DESC, name ASC`,
    [SHARED_USER_ID],
  );
  res.json(rows);
});
