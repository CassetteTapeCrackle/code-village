-- Each player's spend of the day's shared tutor budget, so a few nicknames cannot use all of it.
-- Numbered 0004: report-button already takes 0003.
ALTER TABLE quota ADD COLUMN neurons INTEGER NOT NULL DEFAULT 0;
