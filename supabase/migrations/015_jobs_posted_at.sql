-- Add posted_at column to track original posting date from external sources
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- Backfill: set posted_at = created_at for existing jobs
UPDATE jobs SET posted_at = created_at WHERE posted_at IS NULL;
