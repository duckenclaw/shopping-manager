import { Bot } from 'grammy';
import { pool } from './db.js';
import { isUsernameAllowed } from './auth.js';
import { SHARED_USER_ID } from './constants.js';

export function startBot(token: string): void {
  const bot = new Bot(token);

  bot.command('start', (ctx) =>
    ctx.reply(
      'Отправь сообщение в формате "Товар. Категория" — и я добавлю его в общий список.\n\n' +
      'Категории: Фрукты, Овощи, Мясо, Кондименты, Крупы, Молочка, Сладкое, Дом\n\n' +
      'Или просто "Товар" — категория подберётся из истории автоматически.',
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
    const explicitTag = sep === -1 ? null : text.slice(sep + 2).trim() || null;

    if (!itemName) {
      await ctx.reply('Формат: "Товар. Категория" или просто "Товар"');
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If no tag given, look up the shared catalog for a previously saved tag
      let tag = explicitTag;
      if (!tag) {
        const cached = await client.query(
          'SELECT tag FROM item_catalog WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
          [SHARED_USER_ID, itemName],
        );
        tag = cached.rows[0]?.tag ?? null;
      }

      await client.query(
        'INSERT INTO items (user_id, name, tag) VALUES ($1, $2, $3)',
        [SHARED_USER_ID, itemName, tag],
      );
      await client.query(
        `INSERT INTO item_catalog (user_id, name, tag, last_used_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, name) DO UPDATE SET
           tag = COALESCE(EXCLUDED.tag, item_catalog.tag),
           last_used_at = now()`,
        [SHARED_USER_ID, itemName, tag],
      );

      await client.query('COMMIT');

      const tagLabel = tag ? ` [${tag}]` : '';
      await ctx.reply(`Добавил в общий список: ${itemName}${tagLabel}`);
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
