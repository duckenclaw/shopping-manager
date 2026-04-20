import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { validate, parse } from '@telegram-apps/init-data-node';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../.env') });

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required in .env');
  process.exit(1);
}

const ALLOWED = (process.env.ALLOWED_USERNAMES ?? '')
  .trim()
  .split(/\s+/)
  .filter(Boolean);

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth', (req: Request, res: Response) => {
  const { initDataRaw } = req.body as { initDataRaw?: string };
  if (!initDataRaw) {
    return res.status(400).json({ error: 'missing initDataRaw' });
  }

  try {
    validate(initDataRaw, BOT_TOKEN, { expiresIn: 3600 });
  } catch {
    return res.status(401).json({ error: 'invalid initData' });
  }

  const parsed = parse(initDataRaw);
  const user = parsed.user;
  if (!user) {
    return res.status(400).json({ error: 'no user in initData' });
  }

  const hasAccess = !!user.username && ALLOWED.includes(user.username);

  return res.json({
    hasAccess,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_url,
    },
  });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] allowed usernames: ${ALLOWED.join(', ') || '(none)'}`);
});
