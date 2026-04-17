-- Add new columns to patient_details for the new patient creation flow
ALTER TABLE patient_details
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS treatment_goals TEXT;
