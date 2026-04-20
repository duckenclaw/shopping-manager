CREATE TABLE IF NOT EXISTS places (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  place_id BIGINT REFERENCES places(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  tag TEXT,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_user_idx ON items(user_id);
CREATE INDEX IF NOT EXISTS items_place_idx ON items(place_id);

CREATE TABLE IF NOT EXISTS item_catalog (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  tag TEXT,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS catalog_user_idx ON item_catalog(user_id);

CREATE TABLE IF NOT EXISTS drafts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drafts_user_idx ON drafts(user_id);

CREATE TABLE IF NOT EXISTS draft_items (
  id BIGSERIAL PRIMARY KEY,
  draft_id BIGINT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tag TEXT
);
CREATE INDEX IF NOT EXISTS draft_items_draft_idx ON draft_items(draft_id);
