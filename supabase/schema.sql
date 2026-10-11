-- TrialBites database setup
-- Run this once in a NEW Supabase project: SQL Editor -> New query -> paste -> Run.
-- It creates both tables and the security rules that keep each user's data private.

-- ============================================================
-- Tables
-- ============================================================

-- One row per food trial. Owned by the user who created it.
create table trials (
  id uuid primary key default gen_random_uuid(),
  -- auth.uid() = the logged-in user, so new trials are owned automatically
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_name text not null check (char_length(trim(food_name)) between 1 and 60),
  start_date date not null default current_date,
  status text not null default 'active'
    check (status in ('active', 'safe', 'unsafe')),
  -- When the verdict (safe/unsafe) was given; null while active
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per logged reaction or observation during a trial.
create table symptoms (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references trials (id) on delete cascade,
  symptom_date date not null default current_date,
  -- 0 = no symptoms, 2 = mild, 5 = moderate, 8 = severe (the app's picker)
  severity integer not null check (severity between 0 and 10),
  notes text not null check (char_length(trim(notes)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index trials_user_id_idx on trials (user_id);
create index symptoms_trial_id_idx on symptoms (trial_id);

-- ============================================================
-- Row Level Security: each user can only see and change their own data
-- ============================================================

alter table trials enable row level security;
alter table symptoms enable row level security;

create policy "own trials" on trials
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A symptom belongs to you if the trial it's attached to is yours
create policy "own symptoms" on symptoms
  for all
  to authenticated
  using (
    exists (
      select 1 from trials
      where trials.id = symptoms.trial_id
        and trials.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from trials
      where trials.id = symptoms.trial_id
        and trials.user_id = (select auth.uid())
    )
  );
