import { Bot } from 'grammy';
import { pool } from './db.js';
import { isUsernameAllowed } from './auth.js';

export function startBot(token: string): void {
  const bot = new Bot(token);

  bot.command('start', (ctx) =>
    ctx.reply(
      'Отправь сообщение в формате "Товар. Категория" — и я добавлю его в список.\n\n' +
      'Категории: Фрукты, Овощи, Мясо, Кондименты, Крупы, Молочка, Сладкое, Дом\n\n' +
      'Или просто "Товар" — без категории.',
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
    const itemName = (sep === -1 ? text : text.slice(0, sep)).trim();
    const tag = sep === -1 ? null : text.slice(sep + 2).trim() || null;

    if (!itemName) {
      await ctx.reply('Формат: "Товар. Категория" или просто "Товар"');
      return;
    }

    const userId = from.id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO items (user_id, name, tag) VALUES ($1, $2, $3)',
        [userId, itemName, tag],
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
      const reply = tag ? `Добавил: ${itemName} [${tag}]` : `Добавил: ${itemName}`;
      await ctx.reply(reply);
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
