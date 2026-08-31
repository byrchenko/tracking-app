# Операція «База» — tracking app

A 42-day strength and conditioning tracker built around one program:
[`docs/program/operation-6-weeks.md`](docs/program/operation-6-weeks.md).

The program's own rule sets the design priority:

> Перемагає не той, хто зробив найважче тренування, а той, хто не розірвав
> ланцюг за 42 дні.

So the home screen is the **daily chain**, not the workout.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Supabase (Postgres + Auth + RLS) · Dexie for offline · next-intl (uk/en) ·
Vitest + Playwright · deployed on Vercel.

## Quick start

```bash
nvm use                 # Node 24.20.0, per .nvmrc
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

Open http://localhost:3000 — it redirects to `/uk`. English is at `/en`.

## Documentation

Start at [`docs/README.md`](docs/README.md).

- [Technical plan](docs/plan.md) — stack, data model, offline design, phases, risks
- [Architecture](docs/architecture.md) — how the code is organized
- [Development](docs/development.md) — commands, env vars, local setup
- [Decisions](docs/decisions/) — ADRs

## Status

Phase 0 (foundation) complete: Next 16 + Tailwind + uk/en i18n, the 42-day
schedule math with unit tests, CI, and e2e scaffolding.

Phases 1–6 — data model and RLS, program seed, daily chain, session runner and
progression engine, offline sync, progress charts — are tracked in
[`docs/plan.md`](docs/plan.md#9-build-phases).
