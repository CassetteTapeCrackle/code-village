CREATE TABLE snapshots (
  player_id INTEGER PRIMARY KEY,
  task_id TEXT NOT NULL,
  code TEXT NOT NULL,
  check_json TEXT,
  checks INTEGER NOT NULL,
  hints INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE quota (
  player_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  replies INTEGER NOT NULL DEFAULT 0,
  minute TEXT NOT NULL DEFAULT '',
  minute_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, day)
);
CREATE TABLE usage (
  day TEXT PRIMARY KEY,
  neurons INTEGER NOT NULL
);
