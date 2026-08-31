-- Program template: shared, read-only reference data.
--
-- These tables describe *a* program, not a user's run of it. They are seeded
-- from docs/program/operation-6-weeks.md and are readable by every signed-in
-- user; nobody writes to them from the app.

create type day_type as enum (
  'strength_a',
  'strength_b',
  'walk',
  'long_walk',
  'rest'
);

-- How a given exercise is measured. Drives which set_logs columns are used and
-- which input the session runner shows.
create type exercise_metric as enum (
  'reps',            -- bodyweight reps: push-ups, dead bug
  'reps_weight',     -- reps at a load: goblet squat, kettlebell row
  'time',            -- a hold: bar hang, dip support, plank
  'distance_weight'  -- loaded carry: farmer's walk, suitcase carry
);

create table programs (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  -- Localised strings as {"uk": "...", "en": "..."}. Adding a third locale is
  -- then a data change rather than a migration.
  name          jsonb not null,
  duration_days integer not null default 42,
  version       integer not null default 1,
  created_at    timestamptz not null default now()
);

create table exercises (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          jsonb not null,
  cues          jsonb,
  metric_type   exercise_metric not null,
  is_bodyweight boolean not null default false,
  created_at    timestamptz not null default now()
);

create table program_days (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  day_type   day_type not null,
  name       jsonb not null,
  unique (program_id, day_type)
);

create table program_exercises (
  id                uuid primary key default gen_random_uuid(),
  program_day_id    uuid not null references program_days (id) on delete cascade,
  exercise_id       uuid not null references exercises (id),
  order_index       integer not null,

  -- Starting prescription. Which of these apply depends on metric_type.
  target_sets       integer,
  target_reps       integer,
  target_weight_kg  numeric(5, 2),
  target_seconds    integer,
  target_distance_m numeric(6, 2),

  -- Declarative progression rule, interpreted by src/lib/progression.
  -- See docs/plan.md §5 for the shape.
  progression       jsonb,

  -- Week window in which this exercise is active. The program swaps the
  -- kettlebell deadlift for swings from week 3, which is expressed as two rows
  -- with complementary windows rather than as a special case in code.
  active_from_week  integer not null default 1,
  active_to_week    integer,

  unique (program_day_id, order_index),
  constraint program_exercises_week_window_valid
    check (active_to_week is null or active_to_week >= active_from_week)
);

create index program_exercises_day_idx
  on program_exercises (program_day_id, order_index);

-- Template data is world-readable to signed-in users and never written by the
-- app, so RLS is enabled with a select-only policy and no write policy at all.
alter table programs enable row level security;
alter table exercises enable row level security;
alter table program_days enable row level security;
alter table program_exercises enable row level security;

create policy "program templates are readable by authenticated users"
  on programs for select to authenticated using (true);

create policy "exercises are readable by authenticated users"
  on exercises for select to authenticated using (true);

create policy "program days are readable by authenticated users"
  on program_days for select to authenticated using (true);

create policy "program exercises are readable by authenticated users"
  on program_exercises for select to authenticated using (true);
