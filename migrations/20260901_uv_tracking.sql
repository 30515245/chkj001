ALTER TABLE visit_record ADD COLUMN uv_id TEXT;
ALTER TABLE visit_record ADD COLUMN is_new INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_visit_record_uv_id ON visit_record(uv_id);
