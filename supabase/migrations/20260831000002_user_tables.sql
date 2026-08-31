-- Per-user data.
--
-- Every table here carries user_id, updated_at, and — where rows can be removed
-- — deleted_at. All three are load-bearing for the offline sync layer:
--   * user_id     is what the RLS policies key on
--   * updated_at  drives the delta pull cursor and last-write-wins resolution
--   * deleted_at  makes deletions propagable to a device that was offline when
--                 the delete happened; a hard delete simply cannot be synced
--
-- Primary keys on the sync'd tables are client-generated UUIDv7 rather than
-- database defaults, so that retrying an ambiguous write is an idempotent
-- upsert instead of a duplicate row.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale       text not null default 'uk',
  unit_system  text not null default 'metric',
  height_cm    numeric(5, 1),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_locale_valid check (locale in ('uk', 'en')),
  constraint profiles_unit_system_valid check (unit_system in ('metric', 'imperial'))
);

-- A user's enrolment in a program: their personal 42-day window.
create table user_programs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references programs (id),
  start_date date not null,
  status     text not null default 'active',
  -- Stored per enrolment so "today" stays unambiguous while travelling.
  timezone   text not null default 'Europe/Kyiv',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_programs_status_valid
    check (status in ('active', 'completed', 'abandoned'))
);

create index user_programs_user_idx on user_programs (user_id, status);

create table sessions (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  user_program_id uuid not null references user_programs (id) on delete cascade,
  scheduled_date  date not null,
  day_type        day_type not null,
  status          text not null default 'planned',
  started_at      timestamptz,
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  constraint sessions_status_valid
    check (status in ('planned', 'done', 'skipped')),
  -- One session per calendar day per enrolment. Also makes an offline device's
  -- retried upsert safe.
  unique (user_program_id, scheduled_date)
);

create index sessions_user_date_idx on sessions (user_id, scheduled_date);
create index sessions_sync_idx on sessions (user_id, updated_at);

create table set_logs (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  session_id   uuid not null references sessions (id) on delete cascade,
  exercise_id  uuid not null references exercises (id),
  set_index    integer not null,

  -- Only the columns matching the exercise's metric_type are populated.
  -- Canonical units are SI: kilograms, metres, seconds.
  reps         integer,
  weight_kg    numeric(5, 2),
  duration_sec integer,
  distance_m   numeric(6, 2),

  -- Three-state effort tap, not a 1-10 scale. The program's kettlebell rule
  -- ("коли 5×15 стає легко, бери 20 кг") needs a subjective "was that easy?",
  -- and a coarse tap is what someone will actually answer mid-set.
  rpe          text,
  pain_flag    boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  constraint set_logs_rpe_valid check (rpe is null or rpe in ('easy', 'ok', 'hard')),
  constraint set_logs_set_index_positive check (set_index > 0),
  unique (session_id, exercise_id, set_index)
);

create index set_logs_session_idx on set_logs (session_id);
create index set_logs_history_idx on set_logs (user_id, exercise_id, created_at);
create index set_logs_sync_idx on set_logs (user_id, updated_at);

-- The ланцюг: the part of the program that must not break.
create table daily_chain (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  user_program_id uuid references user_programs (id) on delete cascade,
  date            date not null,
  steps           integer not null default 0,
  mobility_done   boolean not null default false,
  hourly_walks    integer not null default 0,

  -- The program's daily targets are fixed at 7000 steps plus the mobility work,
  -- so completeness is derived rather than stored. Hourly walk breaks are
  -- tracked but deliberately not part of the completeness test — they are not
  -- reliably countable after the fact.
  is_complete     boolean generated always as
                    (steps >= 7000 and mobility_done) stored,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint daily_chain_steps_nonneg check (steps >= 0),
  constraint daily_chain_walks_nonneg check (hourly_walks >= 0),
  unique (user_id, date)
);

create index daily_chain_sync_idx on daily_chain (user_id, updated_at);

create table body_metrics (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  weight_kg  numeric(5, 2),
  waist_cm   numeric(5, 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  unique (user_id, date)
);

create index body_metrics_sync_idx on body_metrics (user_id, updated_at);

-- The day-0 and day-42 tests. Values are stored in the canonical unit for the
-- test (seconds for timed tests, plain counts for rep tests).
create table benchmarks (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  user_program_id uuid not null references user_programs (id) on delete cascade,
  test_key        text not null,
  phase           text not null,
  value           numeric(8, 2) not null,
  unit            text not null,
  taken_at        timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint benchmarks_phase_valid check (phase in ('start', 'end')),
  constraint benchmarks_test_key_valid check (
    test_key in (
      'walk_1500m',     -- seconds
      'bench_pushups',  -- reps
      'squats_1min',    -- reps
      'bar_hang',       -- seconds
      'plank',          -- seconds
      'body_weight',    -- kg
      'waist'           -- cm
    )
  ),
  unique (user_program_id, test_key, phase)
);

create index benchmarks_sync_idx on benchmarks (user_id, updated_at);

-- Cached output of the progression engine, not the authority. The engine
-- recomputes from set_logs history, so fixing a progression rule corrects
-- existing users without a data migration.
create table progression_state (
  id                 uuid primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  user_program_id    uuid not null references user_programs (id) on delete cascade,
  exercise_id        uuid not null references exercises (id),
  current_weight_kg  numeric(5, 2),
  current_target_reps integer,
  unlocked_variant   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (user_program_id, exercise_id)
);

create index progression_state_sync_idx on progression_state (user_id, updated_at);

-- Keep updated_at honest on every sync'd table.
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger user_programs_set_updated_at
  before update on user_programs
  for each row execute function set_updated_at();

create trigger sessions_set_updated_at
  before update on sessions
  for each row execute function set_updated_at();

create trigger set_logs_set_updated_at
  before update on set_logs
  for each row execute function set_updated_at();

create trigger daily_chain_set_updated_at
  before update on daily_chain
  for each row execute function set_updated_at();

create trigger body_metrics_set_updated_at
  before update on body_metrics
  for each row execute function set_updated_at();

create trigger benchmarks_set_updated_at
  before update on benchmarks
  for each row execute function set_updated_at();

create trigger progression_state_set_updated_at
  before update on progression_state
  for each row execute function set_updated_at();

-- Create a profile row automatically for every new auth user, so the app never
-- has to handle a signed-in user without one.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
