-- ============================================================
-- HireMatch — Initial Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- Countries ----
CREATE TABLE countries (
  code TEXT PRIMARY KEY,           -- 'us', 'ca', 'gb', etc.
  name TEXT NOT NULL,
  flag_emoji TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO countries (code, name, flag_emoji, currency) VALUES
  ('us', 'United States', '🇺🇸', 'USD'),
  ('ca', 'Canada', '🇨🇦', 'CAD'),
  ('gb', 'United Kingdom', '🇬🇧', 'GBP'),
  ('ch', 'Switzerland', '🇨🇭', 'CHF'),
  ('de', 'Germany', '🇩🇪', 'EUR'),
  ('fr', 'France', '🇫🇷', 'EUR'),
  ('es', 'Spain', '🇪🇸', 'EUR'),
  ('it', 'Italy', '🇮🇹', 'EUR'),
  ('nl', 'Netherlands', '🇳🇱', 'EUR'),
  ('be', 'Belgium', '🇧🇪', 'EUR'),
  ('at', 'Austria', '🇦🇹', 'EUR'),
  ('pt', 'Portugal', '🇵🇹', 'EUR'),
  ('ie', 'Ireland', '🇮🇪', 'EUR'),
  ('se', 'Sweden', '🇸🇪', 'SEK'),
  ('dk', 'Denmark', '🇩🇰', 'DKK'),
  ('no', 'Norway', '🇳🇴', 'NOK'),
  ('fi', 'Finland', '🇫🇮', 'EUR'),
  ('pl', 'Poland', '🇵🇱', 'PLN'),
  ('cz', 'Czech Republic', '🇨🇿', 'CZK'),
  ('ro', 'Romania', '🇷🇴', 'RON'),
  ('in', 'India', '🇮🇳', 'INR'),
  ('mx', 'Mexico', '🇲🇽', 'MXN'),
  ('br', 'Brazil', '🇧🇷', 'BRL'),
  ('ar', 'Argentina', '🇦🇷', 'ARS'),
  ('cn', 'China', '🇨🇳', 'CNY'),
  ('jp', 'Japan', '🇯🇵', 'JPY'),
  ('kr', 'South Korea', '🇰🇷', 'KRW'),
  ('vn', 'Vietnam', '🇻🇳', 'VND'),
  ('ph', 'Philippines', '🇵🇭', 'PHP');

-- ---- Profiles ----
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ---- Candidates (Job Seekers) ----
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  headline TEXT,
  bio TEXT,
  country TEXT NOT NULL REFERENCES countries(code),
  city TEXT,
  remote_preference TEXT NOT NULL DEFAULT 'any' CHECK (remote_preference IN ('remote', 'hybrid', 'onsite', 'any')),
  skills TEXT[] NOT NULL DEFAULT '{}',
  experience_years INTEGER NOT NULL DEFAULT 0,
  education JSONB NOT NULL DEFAULT '[]',
  work_history JSONB NOT NULL DEFAULT '[]',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  visa_status TEXT,
  salary_expectation_min INTEGER,
  salary_expectation_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  quiz_answers JSONB,
  match_tags TEXT[] NOT NULL DEFAULT '{}',
  cv_url TEXT,
  cv_parsed_at TIMESTAMPTZ,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ---- Recruiters / Employers ----
CREATE TABLE recruiters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  company_website TEXT,
  industry TEXT NOT NULL DEFAULT '',
  company_size TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL REFERENCES countries(code),
  city TEXT,
  bio TEXT,
  culture_tags TEXT[] NOT NULL DEFAULT '{}',
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise', 'agency')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  jobs_posted_count INTEGER NOT NULL DEFAULT 0,
  candidate_views_remaining INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ---- Jobs ----
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  nice_to_haves TEXT[] NOT NULL DEFAULT '{}',
  skills_required TEXT[] NOT NULL DEFAULT '{}',
  job_type TEXT NOT NULL DEFAULT 'full-time' CHECK (job_type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship')),
  work_mode TEXT NOT NULL DEFAULT 'onsite' CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
  country TEXT NOT NULL REFERENCES countries(code),
  city TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  visa_sponsorship BOOLEAN NOT NULL DEFAULT false,
  experience_min INTEGER,
  experience_max INTEGER,
  education_level TEXT,
  industry TEXT NOT NULL DEFAULT '',
  match_tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  applications_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- ---- Applications ----
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN (
    'applied', 'reviewed', 'shortlisted', 'interview_scheduled',
    'interview_completed', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'withdrawn'
  )),
  cover_letter TEXT,
  match_score INTEGER,
  match_explanation TEXT,
  notes TEXT,
  status_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_id)
);

-- ---- Matches (AI-computed) ----
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}',
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_id)
);

-- ---- Quiz Questions ----
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('work_style', 'culture', 'skills', 'values', 'growth')),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  weight NUMERIC NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Visa Requirements ----
CREATE TABLE visa_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin_country TEXT NOT NULL REFERENCES countries(code),
  destination_country TEXT NOT NULL REFERENCES countries(code),
  visa_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  eligible_occupations TEXT[],
  processing_time_days INTEGER,
  fee_amount NUMERIC,
  fee_currency TEXT,
  sponsorship_required BOOLEAN NOT NULL DEFAULT true,
  required_documents TEXT[] NOT NULL DEFAULT '{}',
  min_salary INTEGER,
  min_experience_years INTEGER,
  education_requirements TEXT,
  quota_limited BOOLEAN NOT NULL DEFAULT false,
  annual_quota INTEGER,
  source_url TEXT NOT NULL,
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (origin_country, destination_country, visa_type)
);

-- ---- Webhook Configs (ATS Integration) ----
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Webhook Deliveries (audit trail) ----
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_config_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Indexes ----
CREATE INDEX idx_candidates_country ON candidates(country);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_candidates_match_tags ON candidates USING GIN(match_tags);
CREATE INDEX idx_jobs_country ON jobs(country);
CREATE INDEX idx_jobs_skills ON jobs USING GIN(skills_required);
CREATE INDEX idx_jobs_match_tags ON jobs USING GIN(match_tags);
CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id);
CREATE INDEX idx_jobs_active ON jobs(is_active) WHERE is_active = true;
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_matches_candidate ON matches(candidate_id);
CREATE INDEX idx_matches_job ON matches(job_id);
CREATE INDEX idx_matches_score ON matches(score DESC);
CREATE INDEX idx_visa_destination ON visa_requirements(destination_country);
CREATE INDEX idx_visa_origin_dest ON visa_requirements(origin_country, destination_country);

-- ---- RLS Policies ----
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Candidates can read/write their own profile
CREATE POLICY candidates_own ON candidates
  FOR ALL USING (user_id = auth.uid());

-- Public candidates are readable by anyone
CREATE POLICY candidates_public_read ON candidates
  FOR SELECT USING (is_public = true);

-- Recruiters can read/write their own profile
CREATE POLICY recruiters_own ON recruiters
  FOR ALL USING (user_id = auth.uid());

-- Jobs are publicly readable
CREATE POLICY jobs_public_read ON jobs
  FOR SELECT USING (is_active = true);

-- Recruiters can manage their own jobs
CREATE POLICY jobs_recruiter_manage ON jobs
  FOR ALL USING (recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));

-- Candidates can see their own applications
CREATE POLICY applications_candidate ON applications
  FOR SELECT USING (candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid()));

-- Candidates can create applications
CREATE POLICY applications_candidate_insert ON applications
  FOR INSERT WITH CHECK (candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid()));

-- Recruiters can see applications for their jobs
CREATE POLICY applications_recruiter ON applications
  FOR SELECT USING (recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));

-- Recruiters can update application status
CREATE POLICY applications_recruiter_update ON applications
  FOR UPDATE USING (recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));

-- Matches readable by both sides
CREATE POLICY matches_candidate ON matches
  FOR SELECT USING (candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid()));

CREATE POLICY matches_recruiter ON matches
  FOR SELECT USING (job_id IN (SELECT id FROM jobs WHERE recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid())));
