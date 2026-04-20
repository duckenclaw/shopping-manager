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
Items are grouped by **shopping place** and sorted by **tag** within each group. Swipe gestures on any item:
- **Swipe left** → delete the item
- **Swipe right** → move to a different place (bottom sheet)

Tap **"Начать"** on any group to enter checklist mode.

### Checklist Mode
Items appear larger with a checkbox. Check off what you've put in the cart. Tap **"Завершить поездку"** to delete all checked items and return to the main view.

### Adding Items
Tap **+** in the top-right corner. Start typing — the app searches your item history (catalog):
- **Existing item** → tap to add instantly with its previous tag
- **New item** → choose one of 8 tags (Фрукты, Овощи, Мясо, Кондименты, Крупы, Молочка, Сладкое, Дом), then tap "Добавить новый товар"

### Shopping Places
Manage stores/locations in the **Места** tab. Swipe left to delete a place (items in that place become unassigned).

### Draft Trips (Templates)
The **Шаблоны** tab lets you save a fixed list of items to reuse. Tap a draft, add items with tags, then press **"Применить к поездке"** — pick a destination place and all draft items are added at once.

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
