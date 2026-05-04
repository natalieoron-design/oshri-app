-- Run this in Supabase SQL editor

create table if not exists nutrition_daily_summary (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  total_calories numeric not null default 0,
  total_protein numeric not null default 0,
  total_fat numeric not null default 0,
  total_carbs numeric not null default 0,
  meals_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint nutrition_daily_summary_patient_date unique(patient_id, date)
);

alter table nutrition_daily_summary enable row level security;

create policy "patients can read own summaries"
  on nutrition_daily_summary for select
  using (auth.uid() = patient_id);
