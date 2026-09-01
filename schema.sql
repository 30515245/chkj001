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
  is_bot      INTEGER DEFAULT 0,
  uv_id       TEXT,
  is_new      INTEGER DEFAULT 0
);

-- visit_id 唯一索引：支撑 /api/duration 与中间件的 UPSERT（消除停留时长回写竞态）
-- 已部署的线上库需单独执行一次：npx wrangler d1 execute chzckj_visit_log --remote --command="CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_record_visit_id ON visit_record(visit_id);"
CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_record_visit_id ON visit_record(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_record_uv_id ON visit_record(uv_id);
