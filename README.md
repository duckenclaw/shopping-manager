# Shopping Manager

A Telegram Mini App for managing shopping lists — grouped by store, sorted by category, with a bot shortcut for quick adds.

## Prerequisites

- Node.js 20+
- Docker (for Postgres)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or [ngrok](https://ngrok.com/) for local HTTPS tunneling

## Setup

**1. Clone and install**
```bash
npm install
```

**2. Configure environment**
```bash
cp .env.example .env
```
Edit `.env`:
```
BOT_TOKEN=your_bot_token_here
ALLOWED_USERNAMES="your_telegram_username other_username"
PORT=3001
DATABASE_URL=postgres://shopping:shopping@localhost:5432/shopping
ENABLE_BOT=true
```

**3. Start the database**
```bash
docker compose up -d
```
This starts a Postgres 16 container. The schema is applied automatically on server start.

**4. Start dev servers**
```bash
npm run dev
```
- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:3001`

**5. Expose via tunnel**
```bash
cloudflared tunnel --url http://localhost:5173
# or: ngrok http 5173
```
Copy the HTTPS URL.

**6. Configure the bot's menu button**

In Telegram, message [@BotFather](https://t.me/BotFather):
```
/mybots → your bot → Bot Settings → Menu Button → Configure menu button
```
Paste the tunnel HTTPS URL and set a label (e.g. "Открыть").

Open the bot chat and tap the menu button.

## How It Works

### Access Control
Only Telegram usernames listed in `ALLOWED_USERNAMES` can use the app. The server cryptographically validates Telegram's `initData` signature on every request using your `BOT_TOKEN`. Unauthorized users see "У тебя нет доступа".

### Shopping List (main view)
A flat checklist sorted by tag. Swipe left on any item to delete it. Check items off as you shop — when at least one is checked a **"Готово (N)"** button appears and removes all checked items on tap. Each item has **−/+** amount controls. An **"+ Добавить"** button is always pinned at the bottom.

### Adding Items
Tap **+ Добавить**. Start typing — the app searches your previous items (catalog) and shows matches immediately:
- **Tap a suggestion** → adds instantly with its saved tag
- **No matches** → the tag picker appears; select a category and tap **"Добавить «…»"**

### Draft Templates
The **Шаблоны** tab lets you save a reusable list of items. Tap a draft, add items with optional tags, then tap **"Применить к поездке"** to add all of them to the main list at once.

### Bot Text Commands
Send a message directly to the bot in this format:
```
Яблоки. Пятёрочка
```
The bot adds "Яблоки" to the "Пятёрочка" place (creating the place if it doesn't exist). The known tag for that item (from previous adds) is reused automatically. Unrecognized items get no tag.

## Project Structure

```
shopping-manager/
├── docker-compose.yml        # Postgres service
├── client/                   # Vite + React + TypeScript
│   └── src/
│       ├── api/              # TanStack Query hooks + fetch client
│       ├── components/       # SwipeRow, TagChip, BottomNav, Sheet
│       ├── pages/            # ItemsPage, PlacePage, AddItemPage,
│       │                     #   PlacesPage, DraftsPage, DraftPage
│       └── styles.css        # Full theme (#2e2e2e / #007C3D)
└── server/                   # Express + TypeScript
    └── src/
        ├── schema.sql        # DB schema (auto-applied on start)
        ├── db.ts             # pg Pool + migration runner
        ├── auth.ts           # initData validation middleware
        ├── bot.ts            # grammy polling bot
        └── routes/           # places, items, catalog, drafts
```

## Database

Managed by Docker. To stop (data persists in a named volume):
```bash
docker compose down
```

To reset all data:
```bash
docker compose down -v
```

---

## Deploying to Railway

[Railway](https://railway.com) runs the Express server and Postgres as two services inside one project. The server builds the Vite client and serves it as static files, so only a single service is needed for the app.

### Prerequisites

```bash
npm install -g @railway/cli
railway login
```

### 1 · Create the project

```bash
railway init          # creates a new project, prompts for a name
```

### 2 · Add Postgres

```bash
railway add --database postgres
```

Railway provisions a Postgres instance and automatically injects `DATABASE_URL` into every service in the project. No manual connection-string setup required.

### 3 · Set environment variables

Open the Railway dashboard → your project → the app service → **Variables** tab, then add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BOT_TOKEN` | your Telegram bot token |
| `ALLOWED_USERNAMES` | `"username1 username2"` |
| `ENABLE_BOT` | `true` |

`${{Postgres.DATABASE_URL}}` is a **reference variable** — Railway resolves it to the connection string of the Postgres service at runtime. Replace `Postgres` with whatever Railway named your database service (visible in the left sidebar of your project).

> `PORT` is injected by Railway automatically — do **not** set it manually.

Or from the CLI (reference variables must be quoted to prevent shell expansion):
```bash
railway variables set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
railway variables set BOT_TOKEN=xxxx
railway variables set ALLOWED_USERNAMES="user1 user2"
railway variables set ENABLE_BOT=true
```

### 4 · Deploy

**Option A — from the CLI (push current directory):**
```bash
railway up
```

**Option B — GitHub auto-deploy (recommended):**
1. Push the repo to GitHub.
2. Railway dashboard → New Service → **GitHub Repo** → select the repo.
3. Every push to `main` triggers a redeploy automatically.

Railway uses the [`nixpacks.toml`](nixpacks.toml) in the repo root to build:
```
npm ci → npm run build → node server/dist/index.js
```
The build compiles the TypeScript server and the Vite client. The Express server then serves the client's `dist/` folder as static files in production.

### 5 · Get the public URL

Railway dashboard → your app service → **Settings → Networking → Generate Domain**.

You get a permanent `https://your-app.up.railway.app` URL with automatic SSL.

### 6 · Configure the bot's menu button

In Telegram, message [@BotFather](https://t.me/BotFather):
```
/mybots → your bot → Bot Settings → Menu Button → Configure menu button
```
Paste the Railway HTTPS URL and set a label (e.g. "Открыть"). The bot polls for messages from inside the same process, so no webhook configuration is needed.

### Useful CLI commands

```bash
railway logs          # stream live logs
railway status        # show project and deployment info
railway open          # open the dashboard in a browser
railway ssh           # open a shell inside the running container
railway connect       # open a psql session to the Railway Postgres
railway redeploy      # trigger a fresh deployment of the latest build
```

### Notes

- **Pricing**: Railway's Hobby plan ($5/month) covers a small always-on app + Postgres comfortably. The free trial gives $5 in one-time credits.
- **Postgres data**: Railway's managed Postgres persists across deployments. Use `railway connect` to run manual queries or exports.
- **Schema migrations**: The server runs `schema.sql` on every startup using `ALTER TABLE … IF NOT EXISTS`, so adding new columns is safe and idempotent.
- **Bot polling**: grammy's long-polling runs inside the Express process. If `ENABLE_BOT=false` the bot is skipped (useful for preview/staging environments).
