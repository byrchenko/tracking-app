-- Row Level Security.
--
-- The browser holds a real PostgREST connection using a publishable key that is
-- shipped to every client. There is no API tier in front of the database (see
-- docs/decisions/0002-no-api-layer-no-orm.md), which makes these policies the
-- *entire* security boundary between one user's data and another's.
--
-- A table added later without `enable row level security` is readable by every
-- user of the app. The cross-user tests in src/lib/supabase/rls.test.ts exist to
-- catch exactly that, and the final block in this file fails the migration if a
-- public table ever ships unprotected.

alter table profiles           enable row level security;
alter table user_programs      enable row level security;
alter table sessions           enable row level security;
alter table set_logs           enable row level security;
alter table daily_chain        enable row level security;
alter table body_metrics       enable row level security;
alter table benchmarks         enable row level security;
alter table progression_state  enable row level security;

-- One shape, applied uniformly: you may touch a row exactly when it is yours.
--
-- `using` governs which existing rows are visible to select/update/delete;
-- `with check` governs what a row is allowed to look like after insert/update.
-- Both are required — `using` alone would let a user insert rows owned by
-- someone else.

create policy "own profile"
  on profiles for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "own user_programs"
  on user_programs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own sessions"
  on sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own set_logs"
  on set_logs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own daily_chain"
  on daily_chain for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own body_metrics"
  on body_metrics for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own benchmarks"
  on benchmarks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own progression_state"
  on progression_state for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- `(select auth.uid())` rather than a bare `auth.uid()` is deliberate: wrapping
-- it lets Postgres evaluate the call once per query instead of once per row,
-- which matters on set_logs where a six-week history is thousands of rows.

-- Defence in depth: refuse to finish the migration if any table in `public`
-- has RLS switched off. Catches the realistic failure mode — a future migration
-- adding a table and forgetting the `alter table ... enable row level security`.
do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'Tables in public without RLS enabled: %', unprotected;
  end if;
end;
$$;
