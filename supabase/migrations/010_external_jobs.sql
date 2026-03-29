-- 010_external_jobs.sql
-- Add columns to support external job board aggregation

-- External dedup key
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Apply link for external jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Company info for external jobs (no recruiter account)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_logo TEXT;

-- Source tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- External jobs don't have a recruiter
ALTER TABLE jobs ALTER COLUMN recruiter_id DROP NOT NULL;

-- Index on source for filtering
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);

-- Unique partial index on external_id (nulls excluded)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id) WHERE external_id IS NOT NULL;
