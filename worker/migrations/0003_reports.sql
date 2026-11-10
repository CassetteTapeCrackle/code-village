CREATE TABLE reports (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,                       -- ISO time, server clock
  kind TEXT NOT NULL CHECK (kind IN ('button', 'auto')),
  item TEXT NOT NULL,                     -- lesson, task, variant, boss or stage id
  code_hash TEXT NOT NULL,                -- sha256 of the normalized code, the dedupe key with item
  code TEXT NOT NULL,
  message TEXT,
  build TEXT NOT NULL
);
CREATE INDEX reports_item ON reports (item, code_hash);
CREATE TABLE report_issues (
  item TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  issue INTEGER NOT NULL,                 -- GitHub issue number
  count INTEGER NOT NULL,                 -- reports that landed on this issue
  day TEXT NOT NULL,                      -- YYYY-MM-DD the issue opened, for the daily cap
  PRIMARY KEY (item, code_hash)
);
CREATE INDEX report_issues_day ON report_issues (day);
