import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express, { type Request, type Response } from 'express';
import cors from 'cors';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../.env') });

const { pool, runMigrations } = await import('./db.js');
const { authMiddleware } = await import('./auth.js');
const { placesRouter } = await import('./routes/places.js');
const { itemsRouter } = await import('./routes/items.js');
const { catalogRouter } = await import('./routes/catalog.js');
const { draftsRouter } = await import('./routes/drafts.js');
const { startBot } = await import('./bot.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required in .env');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3001;

await runMigrations();
console.log('[db] migrations applied');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', authMiddleware);

app.get('/api/me', (_req: Request, res: Response) => {
  res.json({ user: res.locals.user, hasAccess: res.locals.hasAccess });
});

app.use('/api/places', placesRouter);
app.use('/api/items', itemsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/drafts', draftsRouter);

// Serve Vite-built client in production
const clientDist = resolve(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(resolve(clientDist, 'index.html')));
  console.log('[server] serving client from', clientDist);
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

if (process.env.ENABLE_BOT !== 'false') {
  startBot(BOT_TOKEN);
}

process.on('SIGTERM', () => { pool.end(); process.exit(0); });
process.on('SIGINT', () => { pool.end(); process.exit(0); });
