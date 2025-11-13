alter table if exists public.workouts
  add column if not exists avg_heart_rate double precision,
  add column if not exists max_heart_rate double precision;
