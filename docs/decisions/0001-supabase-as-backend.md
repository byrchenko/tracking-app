# 1. Supabase as the backend

**Status:** accepted · **Date:** 2026-08-31

## Context

The app needs a free backend with real relational data (set-by-set workout logs),
multi-user auth, and per-user data isolation. It deploys to Vercel.

## Decision

Use Supabase's free tier: Postgres + Auth + Row Level Security.

## Alternatives considered

**Neon** — gives Postgres but no auth, so we'd write and maintain an auth layer
ourselves.

**Firebase** — gives auth but pushes toward a document model that fits
set-by-set logging poorly. Querying "all sets for this exercise across 6 weeks"
is natural in SQL and awkward in Firestore.

**Vercel Postgres** — same missing-auth problem as Neon, with a smaller free tier.

## Consequences

- One vendor covers database, auth and authorization.
- **RLS becomes the entire security boundary** — see ADR 0002.
- Free projects pause after ~7 days of inactivity and need a manual unpause. For
  a daily-use app this is mostly moot, but it will bite during quiet development
  weeks.
- Free-tier limits (roughly 500 MB database, 50k MAU) are far beyond what six
  weeks of training logs need — this app's data is measured in kilobytes.
- These limits are from memory and were not verified against Supabase's current
  pricing page. Confirm before relying on them.
