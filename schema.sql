CREATE TABLE IF NOT EXISTS visit_record (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_url   TEXT,
  visit_path  TEXT,
  visitor_ip  TEXT,
  user_agent  TEXT,
  country     TEXT,
  region      TEXT,
  city        TEXT,
  timezone    TEXT,
  referer     TEXT,
  visit_time  DATETIME DEFAULT CURRENT_TIMESTAMP,
  visit_id    TEXT,
  duration    INTEGER DEFAULT 0,
  ts          INTEGER,
  client      TEXT,
  source      TEXT,
  is_bot      INTEGER DEFAULT 0
);
