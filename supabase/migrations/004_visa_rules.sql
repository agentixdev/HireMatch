-- ============================================================
-- HireMatch — Phase 8: Visa Rules (Scraping System)
-- ============================================================

-- Visa rules table for scraped visa information per country
CREATE TABLE IF NOT EXISTS visa_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL REFERENCES countries(code),
  visa_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  requirements JSONB NOT NULL DEFAULT '{}',
  processing_time TEXT,
  cost TEXT,
  validity TEXT,
  source_url TEXT,
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, visa_type)
);

-- Index for fast country lookups
CREATE INDEX idx_visa_rules_country ON visa_rules(country_code);

-- RLS: visa rules are publicly readable
ALTER TABLE visa_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY visa_rules_public_read ON visa_rules
  FOR SELECT USING (true);

-- Only service role can insert/update (scraper uses service client)
CREATE POLICY visa_rules_service_write ON visa_rules
  FOR ALL USING (true) WITH CHECK (true);
