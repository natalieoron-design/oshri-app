-- Treatment goals table
CREATE TABLE IF NOT EXISTS treatment_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'כללי',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS treatment_goals_patient_id_idx ON treatment_goals(patient_id);

ALTER TABLE treatment_goals ENABLE ROW LEVEL SECURITY;

-- Therapist can read/write all goals for their patients
CREATE POLICY "Therapist manages goals" ON treatment_goals
  FOR ALL USING (
    auth.uid() = therapist_id OR auth.uid() = patient_id
  );
