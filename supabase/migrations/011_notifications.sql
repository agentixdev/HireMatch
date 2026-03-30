-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'match_found', 'application_update', 'job_recommendation', 'system'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,  -- deep link e.g. /dashboard/candidate/applications
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_matches BOOLEAN NOT NULL DEFAULT true,
  email_applications BOOLEAN NOT NULL DEFAULT true,
  email_recommendations BOOLEAN NOT NULL DEFAULT true,
  email_digest TEXT NOT NULL DEFAULT 'daily' CHECK (email_digest IN ('realtime', 'daily', 'weekly', 'never')),
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
