alter table if exists public.workouts
  add column if not exists avg_speed_kmh double precision,
  add column if not exists max_speed_kmh double precision,
  add column if not exists avg_pace_min_per_km double precision,
  add column if not exists best_pace_min_per_km double precision;
