CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  tag TEXT,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_user_idx ON items(user_id);

CREATE TABLE IF NOT EXISTS item_catalog (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  tag TEXT,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS catalog_user_idx ON item_catalog(user_id);

ALTER TABLE items ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS categories_user_idx ON categories(user_id);

-- Purchase log. Rows are snapshots written when items are completed ("Готово"),
-- never when an item is swiped away. added_at carries over items.created_at.
CREATE TABLE IF NOT EXISTS item_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  tag TEXT,
  amount INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_history_user_idx ON item_history(user_id, completed_at DESC);

-- One-time cleanup: places and drafts were removed from the app.
-- Idempotent, so it is safe to leave here across boots.
ALTER TABLE items DROP COLUMN IF EXISTS place_id;
DROP TABLE IF EXISTS draft_items;
DROP TABLE IF EXISTS drafts;
DROP TABLE IF EXISTS places;
