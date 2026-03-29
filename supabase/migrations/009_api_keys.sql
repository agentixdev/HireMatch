-- ============================================================
-- HireMatch — Phase 9: API Keys for Visa Data API
-- ============================================================

-- API keys table for third-party access to visa data
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,              -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL,            -- First 8 chars for identification (hm_live_xxxx...)
  tier TEXT NOT NULL DEFAULT 'starter', -- starter | growth | enterprise
  rate_limit_per_min INT NOT NULL DEFAULT 30,
  monthly_quota INT NOT NULL DEFAULT 1000,
  requests_this_month INT NOT NULL DEFAULT 0,
  quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- API usage logs for analytics and billing
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT NOT NULL,
  response_time_ms INT,
  ip_address TEXT,
  user_agent TEXT,
  query_params JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_recruiter ON api_keys(recruiter_id);
CREATE INDEX idx_api_usage_key ON api_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_created ON api_usage_logs(created_at);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Recruiters can only see their own keys
CREATE POLICY api_keys_own ON api_keys
  FOR ALL USING (
    recruiter_id IN (
      SELECT id FROM recruiters WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY api_keys_service ON api_keys
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY api_usage_service ON api_usage_logs
  FOR ALL USING (true) WITH CHECK (true);
