-- ═══════════════════════════════════════════════════════════════════
-- Row-Level Security Policies for Recruitment Platform
-- All tenant tables enforce org_id = current_setting('app.current_org_id')
-- Set before each request: SET LOCAL app.current_org_id = '<uuid>';
-- ═══════════════════════════════════════════════════════════════════

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_rule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ─── Users ───
CREATE POLICY users_tenant_isolation ON users
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY users_tenant_insert ON users
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── API Keys ───
CREATE POLICY api_keys_tenant_isolation ON api_keys
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY api_keys_tenant_insert ON api_keys
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Sessions ───
CREATE POLICY sessions_tenant_isolation ON sessions
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY sessions_tenant_insert ON sessions
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Audit Log ───
CREATE POLICY audit_log_tenant_isolation ON audit_log
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY audit_log_tenant_insert ON audit_log
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Candidates ───
CREATE POLICY candidates_tenant_isolation ON candidates
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY candidates_tenant_insert ON candidates
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Jobs ───
CREATE POLICY jobs_tenant_isolation ON jobs
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY jobs_tenant_insert ON jobs
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Visa Rules ───
CREATE POLICY visa_rules_tenant_isolation ON visa_rules
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY visa_rules_tenant_insert ON visa_rules
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Visa Rule History ───
CREATE POLICY visa_rule_history_tenant_isolation ON visa_rule_history
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY visa_rule_history_tenant_insert ON visa_rule_history
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Scrape Jobs ───
CREATE POLICY scrape_jobs_tenant_isolation ON scrape_jobs
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY scrape_jobs_tenant_insert ON scrape_jobs
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Scrape Log ───
CREATE POLICY scrape_log_tenant_isolation ON scrape_log
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY scrape_log_tenant_insert ON scrape_log
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Embedding Queue ───
CREATE POLICY embedding_queue_tenant_isolation ON embedding_queue
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY embedding_queue_tenant_insert ON embedding_queue
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Webhook Endpoints ───
CREATE POLICY webhook_endpoints_tenant_isolation ON webhook_endpoints
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY webhook_endpoints_tenant_insert ON webhook_endpoints
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Webhook Deliveries ───
CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY webhook_deliveries_tenant_insert ON webhook_deliveries
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Subscriptions ───
CREATE POLICY subscriptions_tenant_isolation ON subscriptions
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY subscriptions_tenant_insert ON subscriptions
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── API Usage ───
CREATE POLICY api_usage_tenant_isolation ON api_usage
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY api_usage_tenant_insert ON api_usage
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ═══════════════════════════════════════════════════════════════════
-- Post-migration indexes (run after initial data load for IVFFlat)
-- ═══════════════════════════════════════════════════════════════════

-- IVFFlat indexes for pgvector cosine similarity
-- Note: IVFFlat requires data to exist for training. Run after seeding.
-- CREATE INDEX candidate_embedding_idx ON candidates
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX job_embedding_idx ON jobs
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS candidate_fts_idx ON candidates
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(raw_text, '')));
CREATE INDEX IF NOT EXISTS job_fts_idx ON jobs
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(raw_text, '')));
