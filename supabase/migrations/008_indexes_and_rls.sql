-- 008_indexes_and_rls.sql
-- Performance indexes for common lookups + RLS on webhook tables

-- ── Performance indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recruiters_stripe_customer_id ON recruiters(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_recruiters_stripe_subscription_id ON recruiters(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_is_active ON webhook_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config_status ON webhook_deliveries(webhook_config_id, status);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id_public ON candidates(user_id, is_public);
CREATE INDEX IF NOT EXISTS idx_visa_rules_country_code ON visa_rules(country_code);

-- ── Enable RLS on webhook tables ─────────────────────────────────────
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Webhook configs: recruiters can only manage their own
CREATE POLICY webhook_configs_recruiter_manage ON webhook_configs
  FOR ALL USING (recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));

-- Webhook deliveries: recruiters can view deliveries for their configs
CREATE POLICY webhook_deliveries_recruiter_view ON webhook_deliveries
  FOR SELECT USING (webhook_config_id IN (
    SELECT id FROM webhook_configs WHERE recruiter_id IN (
      SELECT id FROM recruiters WHERE user_id = auth.uid()
    )
  ));

-- Webhook events: recruiters can view events for their org
CREATE POLICY webhook_events_recruiter_view ON webhook_events
  FOR SELECT USING (org_id IN (
    SELECT id FROM recruiters WHERE user_id = auth.uid()
  ));
