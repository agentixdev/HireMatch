-- ============================================================
-- HireMatch — Recruiter Matchmaker Feature
-- Adds match_tags to recruiters, recruiter_match_results table,
-- and recruiter onboarding metadata.
-- ============================================================

-- Add match_tags and onboarding metadata to recruiters
ALTER TABLE recruiters
  ADD COLUMN IF NOT EXISTS match_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS values_dna JSONB,
  ADD COLUMN IF NOT EXISTS work_style JSONB,
  ADD COLUMN IF NOT EXISTS hiring_needs JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Recruiter match results — stores matchmaker quiz results
CREATE TABLE IF NOT EXISTS recruiter_match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  quiz_answers JSONB NOT NULL DEFAULT '{}',
  candidates JSONB NOT NULL DEFAULT '[]',  -- array of { candidate_id, score, breakdown, explanation }
  total_scanned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruiter_match_results_recruiter ON recruiter_match_results(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_match_results_created ON recruiter_match_results(created_at DESC);
