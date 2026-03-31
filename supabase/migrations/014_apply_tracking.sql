-- 014_apply_tracking.sql
-- Enable application tracking for external jobs and AI-boosted applications

-- Make recruiter_id nullable (external jobs have no recruiter)
ALTER TABLE applications ALTER COLUMN recruiter_id DROP NOT NULL;

-- Add tracking columns
ALTER TABLE applications ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS apply_method TEXT DEFAULT 'internal'
  CHECK (apply_method IN ('quick', 'ai_boost', 'internal'));
