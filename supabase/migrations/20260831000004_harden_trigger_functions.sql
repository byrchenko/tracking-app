-- Harden the two trigger functions flagged by the Supabase security advisor.
--
-- Both are invoked by triggers only. Because they live in `public`, PostgREST
-- also exposes them as RPC endpoints (/rest/v1/rpc/...), which is not intended:
-- `handle_new_user` is SECURITY DEFINER, so a caller reaching it directly would
-- run it with the definer's rights.
--
-- Postgres checks EXECUTE on a trigger function when the trigger is *created*,
-- not each time it fires, so revoking EXECUTE here does not stop the triggers.
-- This was verified against the live database: inserting an auth.users row still
-- creates the profile, and an update still bumps updated_at.

-- Pin the search_path so the function body cannot be redirected by a caller's
-- search_path. It touches no tables, so an empty path is sufficient.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
