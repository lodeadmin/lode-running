alter table if exists public.workouts
  add column if not exists terra_user_id text,
  add column if not exists provider text,
  add column if not exists started_at text,
  add column if not exists steps numeric,
  add column if not exists modality text,
  add column if not exists source text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

create index if not exists workouts_terra_user_id_idx on public.workouts (terra_user_id);
create index if not exists workouts_provider_idx on public.workouts (provider);
