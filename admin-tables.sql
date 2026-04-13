-- Admin: Message templates
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Therapist manages templates"
  ON message_templates FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'therapist');

-- Admin: Notification rules
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_time TIME,
  trigger_days INTEGER[],
  custom_message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Therapist manages notification rules"
  ON notification_rules FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'therapist');

-- Admin: App settings (key-value)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Therapist manages settings"
  ON app_settings FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'therapist');

-- Seed default settings
INSERT INTO app_settings (key, value, label) VALUES
  ('app_name', 'אושרי הרץ - נטורופתית N.D', 'שם האפליקציה'),
  ('reminder_default_time', '20:00', 'שעת תזכורת ברירת מחדל'),
  ('water_goal_default', '8', 'יעד כוסות מים (ברירת מחדל)'),
  ('calorie_goal_default', '1800', 'יעד קלוריות (ברירת מחדל)'),
  ('welcome_message', 'ברוכים הבאים לאפליקציית הבריאות של אושרי הרץ!', 'הודעת ברוכים הבאים')
ON CONFLICT (key) DO NOTHING;
