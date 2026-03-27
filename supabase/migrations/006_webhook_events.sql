-- ---- Webhook Events (event log for the event bus) ----
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  correlation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  triggered_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_events_org ON webhook_events(org_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at);

-- Add columns to webhook_deliveries for richer tracking
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES webhook_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error TEXT;

CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_event_id ON webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at);
CREATE INDEX idx_webhook_deliveries_config_status ON webhook_deliveries(webhook_config_id, status);
