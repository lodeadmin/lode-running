alter table if exists public.workouts
  add column if not exists rhr numeric;
