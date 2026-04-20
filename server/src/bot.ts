import { Bot } from 'grammy';
import { pool } from './db.js';
import { isUsernameAllowed } from './auth.js';

export function startBot(token: string): void {
  const bot = new Bot(token);

  bot.command('start', (ctx) =>
    ctx.reply(
      'Отправь сообщение в формате "Товар. Магазин" — и я добавлю его в твой список.',
    ),
  );

  bot.on('message:text', async (ctx) => {
    const from = ctx.from;
    const text = ctx.message.text.trim();
    if (!from || text.startsWith('/')) return;
    if (!isUsernameAllowed(from.username)) {
      await ctx.reply('У тебя нет доступа.');
      return;
    }

    const sep = text.indexOf('. ');
    if (sep === -1) {
      await ctx.reply('Формат: "Товар. Магазин"');
      return;
    }
    const itemName = text.slice(0, sep).trim();
    const placeName = text.slice(sep + 2).trim();
    if (!itemName || !placeName) {
      await ctx.reply('Формат: "Товар. Магазин"');
      return;
    }

    const userId = from.id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const place = await client.query(
        `INSERT INTO places (user_id, name) VALUES ($1, $2)
         ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [userId, placeName],
      );
      const placeId = place.rows[0].id as number;

      const cached = await client.query(
        'SELECT tag FROM item_catalog WHERE user_id = $1 AND name = $2',
        [userId, itemName],
      );
      const tag = cached.rows[0]?.tag ?? null;

      await client.query(
        'INSERT INTO items (user_id, place_id, name, tag) VALUES ($1, $2, $3, $4)',
        [userId, placeId, itemName, tag],
      );
      await client.query(
        `INSERT INTO item_catalog (user_id, name, tag, last_used_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, name) DO UPDATE SET
           tag = COALESCE(EXCLUDED.tag, item_catalog.tag),
           last_used_at = now()`,
        [userId, itemName, tag],
      );
      await client.query('COMMIT');
      await ctx.reply(`Добавил: ${itemName} → ${placeName}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[bot] add failed', e);
      await ctx.reply('Ошибка, попробуй ещё раз.');
    } finally {
      client.release();
    }
  });

  bot.catch((err) => console.error('[bot] error', err));
  bot.start({ onStart: (info) => console.log(`[bot] polling as @${info.username}`) });
}
