# 2. No API layer, no ORM

**Status:** accepted · **Date:** 2026-08-31

## Context

Every query in this app is scoped to the signed-in user. The obvious Next.js
shape would be Route Handlers wrapping a database client, with an ORM for typing.

## Decision

The browser talks to Postgres directly through `supabase-js` (PostgREST), with
Row Level Security enforcing isolation. Schema lives in plain SQL migrations
under `supabase/migrations/`; types are generated with
`supabase gen types typescript` and committed.

## Rationale

**No API layer** — an API tier here would only re-implement the authorization
that RLS already enforces, and it would have to be duplicated in the offline sync
path anyway. Skipping it removes a whole tier to write, deploy and keep in sync.

**No ORM** — Drizzle and Prisma both add a schema definition that duplicates the
SQL migrations, and neither understands RLS policies, so the policies would live
in raw SQL regardless. Prisma additionally has awkward connection pooling on
serverless free tiers. Generated types give the same type safety with none of that.

## Consequences

- **RLS is the entire security boundary.** The anon key is public by design and
  shipped to the browser. A single table missing `enable row level security`
  exposes every user's rows.
- This makes the cross-user RLS tests non-optional, and they must run in CI on
  every migration change — see ADR 0003.
- Schema changes are hand-written SQL. That is more typing than an ORM migration
  generator, and it is also exactly what gets reviewed.
