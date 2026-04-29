-- Treatment goals table (already created in Supabase without therapist_id/is_active)
-- Run only if table doesn't exist yet:
CREATE TABLE IF NOT EXISTS treatment_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'כללי',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS treatment_goals_patient_id_idx ON treatment_goals(patient_id);

ALTER TABLE treatment_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can manage goals" ON treatment_goals
  FOR ALL USING (auth.role() = 'authenticated');

-- Optional future columns:
-- ALTER TABLE treatment_goals ADD COLUMN IF NOT EXISTS therapist_id UUID;
-- ALTER TABLE treatment_goals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
