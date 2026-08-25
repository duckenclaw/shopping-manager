import { Bot, InlineKeyboard } from 'grammy';
import { pool } from './db.js';
import { isUsernameAllowed } from './auth.js';
import { dropPending, getPending, putPending, type Pending } from './bot-state.js';
import { addItem, findSimilar, listCategories, type SimilarMatch } from './services/items.js';

/** Categories per page in the picker. Two per row, so this fills three rows. */
const CATEGORIES_PER_PAGE = 5;

export function startBot(token: string): void {
  const bot = new Bot(token);

  bot.command('start', (ctx) =>
    ctx.reply(
      'Отправь сообщение в формате "Товар. Категория" — и я добавлю его в общий список.\n\n' +
      'Категории: Фрукты, Овощи, Мясо, Кондименты, Крупы, Молочка, Сладкое, Дом\n\n' +
      'Или просто "Товар" — категория подберётся из истории автоматически.\n\n' +
      'Если найдётся что-то похожее, я предложу выбрать из уже добавленного.',
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

    let matches: SimilarMatch[];
    try {
      matches = await findSimilar(itemName);
    } catch (e) {
      console.error('[bot] search failed', e);
      await ctx.reply('Ошибка, попробуй ещё раз.');
      return;
    }

    // Typing a name that already exists is the common case — add it straight away
    // rather than asking the user to confirm what they just wrote. The stored
    // spelling wins, so repeat adds never spawn case variants.
    const exact = pickExact(matches, itemName);
    if (exact) {
      await commitAdd(ctx, exact.name, explicitTag ?? exact.tag);
      return;
    }
    if (!matches.length) {
      await commitAdd(ctx, itemName, explicitTag);
      return;
    }

    const token = putPending({
      query: itemName,
      explicitTag,
      matches,
      categories: await listCategories(),
    });

    const kb = new InlineKeyboard();
    for (const [i, m] of matches.entries()) {
      kb.text(m.tag ? `${m.name} — ${m.tag}` : m.name, `pick:${token}:${i}`).row();
    }
    kb.text(`Добавить «${itemName}» как новый`, `new:${token}`).row();
    kb.text('Отмена', `cancel:${token}`);

    await ctx.reply('Похожие уже есть. Выбери, что добавить:', { reply_markup: kb });
  });

  bot.on('callback_query:data', async (ctx) => {
    // A callback is its own update — the message handler's access check does not cover it.
    if (!isUsernameAllowed(ctx.from.username)) {
      await ctx.answerCallbackQuery('У тебя нет доступа.');
      return;
    }

    const [action, token, arg] = ctx.callbackQuery.data.split(':');
    const entry = getPending(token);
    if (!entry) {
      await ctx.answerCallbackQuery('Устарело, отправь товар ещё раз.');
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      return;
    }

    try {
      switch (action) {
        case 'pick': {
          const match = entry.matches[Number(arg)];
          if (!match) break;
          dropPending(token);
          const tag = entry.explicitTag ?? match.tag;
          await ctx.editMessageText(await addAndDescribe(match.name, tag));
          break;
        }
        case 'new': {
          // A category was already given in the message, so there is nothing to ask.
          if (entry.explicitTag) {
            dropPending(token);
            await ctx.editMessageText(await addAndDescribe(entry.query, entry.explicitTag));
            break;
          }
          await ctx.editMessageText(`Добавляю «${entry.query}» как новый товар.`);
          await ctx.reply(`Категория для «${entry.query}»:`, {
            reply_markup: categoryKeyboard(entry, token, 0),
          });
          break;
        }
        case 'page': {
          await ctx.editMessageReplyMarkup({
            reply_markup: categoryKeyboard(entry, token, Number(arg)),
          });
          break;
        }
        case 'cat': {
          const tag = arg === 'none' ? null : entry.categories[Number(arg)];
          if (tag === undefined) break;
          dropPending(token);
          await ctx.editMessageText(await addAndDescribe(entry.query, tag));
          break;
        }
        case 'cancel': {
          dropPending(token);
          await ctx.editMessageText('Отменено.');
          break;
        }
      }
      await ctx.answerCallbackQuery();
    } catch (e) {
      console.error('[bot] callback failed', e);
      await ctx.answerCallbackQuery('Ошибка, попробуй ещё раз.');
    }
  });

  bot.catch((err) => console.error('[bot] error', err));
  bot.start({ onStart: (info) => console.log(`[bot] polling as @${info.username}`) });
}

/** An existing name equal to what was typed, ignoring case. Prefers one that carries a tag. */
function pickExact(matches: SimilarMatch[], typed: string): SimilarMatch | undefined {
  const exact = matches.filter((m) => m.name.toLowerCase() === typed.toLowerCase());
  return exact.find((m) => m.tag) ?? exact[0];
}

function categoryKeyboard(entry: Pending, token: string, page: number): InlineKeyboard {
  const pages = Math.max(1, Math.ceil(entry.categories.length / CATEGORIES_PER_PAGE));
  const current = ((page % pages) + pages) % pages;
  const start = current * CATEGORIES_PER_PAGE;
  const slice = entry.categories.slice(start, start + CATEGORIES_PER_PAGE);

  // Two per row, closing each row as it is filled. Closing a row that is already
  // closed would leave an empty row behind on even-length pages, which Telegram rejects.
  const kb = new InlineKeyboard();
  for (let i = 0; i < slice.length; i += 2) {
    slice.slice(i, i + 2).forEach((name, j) => kb.text(name, `cat:${token}:${start + i + j}`));
    kb.row();
  }
  if (pages > 1) {
    if (current > 0) kb.text('Назад', `page:${token}:${current - 1}`);
    if (current < pages - 1) kb.text('Далее', `page:${token}:${current + 1}`);
    kb.row();
  }
  kb.text('Без категории', `cat:${token}:none`).text('Отмена', `cancel:${token}`);
  return kb;
}

/** Run the add in its own transaction and return the line to show the user. */
async function addAndDescribe(name: string, tag: string | null): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await addItem(client, { name, tag });
    await client.query('COMMIT');
    const tagLabel = row.tag ? ` [${row.tag}]` : '';
    const amountLabel = row.amount > 1 ? ` — теперь ${row.amount} шт.` : '';
    return `Добавил в общий список: ${row.name}${tagLabel}${amountLabel}`;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** addAndDescribe plus the reply, for the paths that add without asking anything. */
async function commitAdd(
  ctx: { reply: (text: string) => Promise<unknown> },
  name: string,
  tag: string | null,
): Promise<void> {
  try {
    await ctx.reply(await addAndDescribe(name, tag));
  } catch (e) {
    console.error('[bot] add failed', e);
    await ctx.reply('Ошибка, попробуй ещё раз.');
  }
}
