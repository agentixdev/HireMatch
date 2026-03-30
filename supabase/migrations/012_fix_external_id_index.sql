-- 012_fix_external_id_index.sql
-- Replace partial unique index with a full unique constraint
-- PostgREST ON CONFLICT requires a non-partial unique index/constraint

DROP INDEX IF EXISTS idx_jobs_external_id;
ALTER TABLE jobs ADD CONSTRAINT uq_jobs_external_id UNIQUE (external_id);
