CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  nickname TEXT NOT NULL,
  nickname_key TEXT NOT NULL UNIQUE,      -- lowercase, for case-insensitive uniqueness
  recovery_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,               -- ISO time
  last_active TEXT NOT NULL               -- YYYY-MM-DD, server clock
);
CREATE TABLE tokens (
  hash TEXT PRIMARY KEY,
  player_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('main', 'agent')),
  created_at TEXT NOT NULL
);
CREATE INDEX tokens_player ON tokens (player_id);
CREATE TABLE events (
  player_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  at TEXT NOT NULL,                       -- client day, shown on cards
  received TEXT NOT NULL,                 -- server day, used for the weekly board and news
  hints INTEGER,
  code TEXT,
  PRIMARY KEY (player_id, kind, item_id)
);
CREATE INDEX events_received ON events (received);
CREATE TABLE saves (
  player_id INTEGER PRIMARY KEY,
  revision INTEGER NOT NULL,
  blob TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE ip_buckets (
  bucket TEXT PRIMARY KEY,                -- sha256(salt + day + ip): no IP is stored
  day TEXT NOT NULL,
  count INTEGER NOT NULL
);
CREATE TABLE flags (
  key TEXT PRIMARY KEY,                   -- 'tutor_off', 'ban:<nickname_key>'
  value TEXT NOT NULL
);
