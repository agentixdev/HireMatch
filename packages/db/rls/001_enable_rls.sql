-- Enable RLS on all tenant tables
-- Run after initial migration creates tables

-- Auth & tenancy
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Core data
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_rule_history ENABLE ROW LEVEL SECURITY;

-- Pipeline
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_queue ENABLE ROW LEVEL SECURITY;

-- Webhooks
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Billing
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ───
-- All tenant tables use: current_setting('app.current_org_id')::uuid
-- Service role bypasses RLS via: SET ROLE service_role;

-- Organisations: users can only see their own org
CREATE POLICY org_isolation ON organisations
  FOR ALL USING (id = current_setting('app.current_org_id', true)::uuid);

-- Users: scoped to org
CREATE POLICY user_org_isolation ON users
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- API Keys: scoped to org
CREATE POLICY api_key_org_isolation ON api_keys
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Sessions: scoped to org
CREATE POLICY session_org_isolation ON sessions
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Audit Log: scoped to org
CREATE POLICY audit_org_isolation ON audit_log
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Candidates: scoped to org
CREATE POLICY candidate_org_isolation ON candidates
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Jobs: scoped to org
CREATE POLICY job_org_isolation ON jobs
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Applications: scoped to org
CREATE POLICY application_org_isolation ON applications
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Matches: scoped to org
CREATE POLICY match_org_isolation ON matches
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Quiz Questions: scoped to org
CREATE POLICY quiz_question_org_isolation ON quiz_questions
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Quiz Results: scoped to org
CREATE POLICY quiz_result_org_isolation ON quiz_results
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Visa Rules: scoped to org
CREATE POLICY visa_rule_org_isolation ON visa_rules
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Visa Rule History: scoped to org
CREATE POLICY visa_history_org_isolation ON visa_rule_history
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Scrape Jobs: scoped to org
CREATE POLICY scrape_job_org_isolation ON scrape_jobs
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Scrape Log: scoped to org
CREATE POLICY scrape_log_org_isolation ON scrape_log
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Embedding Queue: scoped to org
CREATE POLICY embed_queue_org_isolation ON embedding_queue
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Webhook Endpoints: scoped to org
CREATE POLICY webhook_endpoint_org_isolation ON webhook_endpoints
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Webhook Deliveries: scoped to org
CREATE POLICY webhook_delivery_org_isolation ON webhook_deliveries
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Subscriptions: scoped to org
CREATE POLICY subscription_org_isolation ON subscriptions
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- API Usage: scoped to org
CREATE POLICY api_usage_org_isolation ON api_usage
  FOR ALL USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── Service Role Bypass ───
-- Create a service role that bypasses RLS for internal operations

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

-- Grant service_role access to bypass RLS
ALTER TABLE organisations FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Service policies (for internal workers that need cross-tenant access)
CREATE POLICY service_bypass_organisations ON organisations
  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass_users ON users
  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass_candidates ON candidates
  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass_jobs ON jobs
  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass_visa_rules ON visa_rules
  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass_scrape_jobs ON scrape_jobs
  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass_scrape_log ON scrape_log
  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass_embedding_queue ON embedding_queue
  FOR ALL TO service_role USING (true);
