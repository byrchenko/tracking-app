# 3. RLS tests run against a remote dev project

**Status:** accepted · **Date:** 2026-08-31

## Context

ADR 0002 makes Row Level Security the only thing separating one user's data from
another's. That demands an automated test proving user A cannot read user B's
rows, run on every migration change.

The plan assumed `supabase start`, which spins up the whole stack locally in
Docker. **This environment has no Docker**, and installing it needs root.

## Decision

Run RLS tests against a real Supabase **dev** project (separate from production),
using two seeded test accounts. The test signs in as each and asserts the other's
rows are invisible.

Tests skip themselves with a clear message when the Supabase environment
variables are absent, so `npm test` still works on a fresh checkout.

## Consequences

- Requires a dev Supabase project and its credentials in CI secrets.
- The tests hit the network, so they are slower and can fail for reasons
  unrelated to the code. They are kept in a separate Vitest project from the pure
  unit tests so a network blip never blocks the fast feedback loop.
- **Tests must clean up after themselves** — they write to a shared remote
  database, not a fresh container per run.
- If Docker becomes available, switching to `supabase start` is a strict
  improvement and this ADR should be superseded.
