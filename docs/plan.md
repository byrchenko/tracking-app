# Tracking App — Technical Plan

A training tracker for the **ОПЕРАЦІЯ «БАЗА»** 42-day program (`operation-6-weeks.md`), built to be
usable by multiple people running their own cycle, working offline in a basement gym, in Ukrainian
and English.

**Decisions locked in:** multi-user with auth from day one · offline-first installable PWA ·
uk/en i18n · free-tier backend · Vercel deployment.

---

## 1. Product shape

The program document defines the whole domain. Three distinct things get tracked, and conflating
them is the main modelling mistake to avoid:

| Layer | What it is | Frequency | Breaks if missed |
|---|---|---|---|
| **Ланцюг (chain)** | 7000 steps, 5 min mobility, hourly 3-min walk | Every day, no exceptions | Yes — this is the streak |
| **Тренування (sessions)** | Strength A / Strength B / walk / long walk / rest | Per weekly cycle | No — "пропустив день — ідеш далі за планом" |
| **Норматив (benchmarks)** | 7 tests on day 0 and day 42 | Twice | N/A |

The core design principle comes straight from the program: *"перемагає не той, хто зробив найважче
тренування, а той, хто не розірвав ланцюг за 42 дні."* The home screen is therefore the **chain**,
not the workout. The workout is secondary content on the same screen.

Explicit non-goal for v1: this is not a general fitness tracker. It runs *this* program (with the
schema generalized enough that a second program could be seeded later without migration).

### Screens

1. **Today** — chain checklist (3 taps), today's session card, current streak, day N of 42.
2. **Session runner** — exercise-by-exercise, set logging, 90 s rest timer, targets pre-filled by
   the progression engine, per-exercise pain flag.
3. **42-day grid** — the checklist from the program as a visual 6×7 grid; the artifact you look at
   to not break the chain.
4. **Progress** — body weight & waist over time, volume per lift, benchmark start-vs-week-6 table.
5. **Benchmarks** — day 0 entry, day 42 entry, side-by-side delta.
6. **Settings** — locale, units, program start date, data export, sign out.

### Deliberately out of scope for v1

- Step counting via Apple Health / Google Health Connect — **not reachable from a web app.** Steps
  are a manual number input. This is a real limitation of the free/web path; the honest workaround
  is typing the number your phone already shows you, once a day.
- Push notification reminders — see §7, deferred to v2 for good reasons.
- Social features, sharing, leaderboards.

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + React 19, TypeScript strict | First-class Vercel target; server components for the static program content, client components for the logging UI |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Copy-in components, no runtime dep, easy to make touch targets big enough for sweaty hands |
| Backend | **Supabase** free tier — Postgres + Auth + RLS | Genuinely free, real Postgres, auth and row-level security included; no server code needed for CRUD |
| DB access | `supabase-js` from the client | RLS enforces isolation, so the client can talk to the DB directly. No API layer to write or maintain |
| Migrations | **Supabase CLI** (`supabase/migrations/*.sql`) | Plain SQL in git, applied in CI. Avoids an ORM that fights RLS |
| Types | `supabase gen types typescript` | Generated from schema, committed, checked in CI |
| Local store | **Dexie** (IndexedDB) | Source of truth for the UI; see §4 |
| Server state | **TanStack Query** | Cache + mutation lifecycle around the sync layer |
| Forms | **react-hook-form** + **Zod** | Zod schemas shared between form validation and sync payload validation |
| Charts | **Recharts** | Enough for 4 charts; light |
| i18n | **next-intl** | App Router-native, works in server and client components |
| Dates | **date-fns** + `date-fns/locale/uk` | Program is day-and-week driven; needs correct Monday-start weeks |
| Tests | **Vitest** (unit) + **Playwright** (e2e) | See §8 |
| Deploy | **Vercel** Hobby | Free, zero-config for Next.js |

**Why not Neon/Turso/Firebase:** Supabase bundles Postgres + auth + RLS in one free tier. Neon gives
Postgres but no auth, so you'd write and maintain an auth layer. Firebase gives auth but pushes you
into a document model that fits set-by-set logging poorly.

**Why no ORM (Drizzle/Prisma):** every query here is user-scoped and goes through RLS. An ORM adds a
schema-definition layer that duplicates the SQL migrations and doesn't understand RLS policies, and
Prisma's connection pooling is awkward on serverless free tiers. Generated types give the same
type-safety benefit with none of that.

---

## 3. Data model

Canonical units are stored SI — kilograms, centimetres, metres, seconds — and converted at display
time. This keeps the progression math unit-free and makes a future lb/mi toggle a pure UI change.

### Program template (shared, read-only to users)

```
programs            id, slug, name jsonb{uk,en}, duration_days, version
exercises           id, slug, name jsonb{uk,en}, cues jsonb{uk,en},
                    metric_type ('reps'|'reps_weight'|'time'|'distance_weight'),
                    is_bodyweight
program_days        id, program_id, day_type ('strength_a'|'strength_b'|'walk'|
                    'long_walk'|'rest'), name jsonb
program_exercises   id, program_day_id, exercise_id, order_index,
                    target_sets, target_reps, target_weight_kg, target_seconds,
                    target_distance_m,
                    progression jsonb,   -- see §5
                    active_from_week, active_to_week   -- deadlift w1-2 → swings w3+
```

`name` as `jsonb {uk, en}` rather than `name_uk`/`name_en` columns — adding a third locale is then a
data change, not a migration.

### User data (RLS-protected)

```
profiles            id → auth.users, display_name, locale, unit_system,
                    height_cm, created_at
user_programs       id, user_id, program_id, start_date, status, timezone
sessions            id, user_program_id, user_id, scheduled_date, program_day_id,
                    status ('planned'|'done'|'skipped'), started_at, completed_at,
                    notes, updated_at, deleted_at
set_logs            id (client uuid), session_id, user_id, exercise_id, set_index,
                    reps, weight_kg, duration_sec, distance_m, rpe,
                    pain_flag bool, updated_at, deleted_at
daily_chain         id, user_id, user_program_id, date, steps int,
                    mobility_done bool, hourly_walks int,
                    is_complete bool GENERATED, updated_at
body_metrics        id, user_id, date, weight_kg, waist_cm, updated_at
benchmarks          id, user_id, user_program_id, test_key, phase ('start'|'end'),
                    value numeric, unit, taken_at, updated_at
progression_state   id, user_id, user_program_id, exercise_id,
                    current_weight_kg, current_target_reps, unlocked_variant,
                    updated_at
```

**Every user table carries `user_id`, `updated_at`, and (where deletable) `deleted_at`.** All three
are load-bearing for sync (§4) — soft deletes because a hard delete can't be propagated to a device
that was offline when it happened.

### RLS

One policy shape, applied uniformly:

```sql
alter table set_logs enable row level security;

create policy "own rows" on set_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Program template tables get `for select using (true)` and no write policy. `daily_chain` gets a
`unique (user_id, date)` constraint so an offline device retrying an upsert can't create duplicates.

**RLS is the entire security boundary here** — the client holds a real Postgres connection via
PostgREST. A missing `enable row level security` on one table exposes every user's rows. §8 covers
testing this specifically.

---

## 4. Offline-first architecture

This is the hardest part of the build and the phase most likely to overrun. The approach:

**IndexedDB is the source of truth for the UI. The network is a background detail.**

```
  UI  ──reads──►  Dexie (IndexedDB)  ◄──writes── UI (instant, optimistic)
                       │  ▲
                  push │  │ pull
                       ▼  │
                  Sync engine  ◄── online/visibility/interval triggers
                       │  ▲
                       ▼  │
                  Supabase (Postgres)
```

**Writes.** Every mutation writes to Dexie and appends to an `outbox` table in the same IndexedDB
transaction. The UI re-renders from Dexie immediately — logging a set never waits on a network call.

**Push.** The sync engine drains the outbox in order. Every record uses a **client-generated UUIDv7**
as its primary key, so a retry after an ambiguous failure is an idempotent upsert rather than a
duplicate row. An entry that fails with a 4xx (bad data, RLS rejection) moves to a dead-letter list
surfaced in Settings instead of blocking the queue forever.

**Pull.** Delta fetch: `select * where user_id = me and updated_at > :last_pull_cursor`, including
soft-deleted rows so deletions propagate. Cursor stored per table.

**Conflicts.** Last-write-wins per row on `updated_at`. This is a genuinely correct choice here, not
a shortcut: the data is single-writer-per-user, and the realistic conflict is "same person, two
devices, same set" — where the later edit is the intended one. No CRDT needed.

**Triggers.** `online` event, `visibilitychange` to visible, a 60 s interval while the app is
foregrounded, and on app start. Notably **not** the Background Sync API — Safari doesn't implement
it, so on iPhone all sync is foreground-triggered. Design accordingly: never show "saved" state that
depends on the server having acknowledged.

**Service worker.** The plan assumed `@serwist/next`, but Next 16 builds with Turbopack by default
and fails the build outright when a webpack config is present — which is how Serwist injects itself.
Phase 5 should expect to hand-write `public/sw.js` and register it manually instead: precache the app
shell and program content, network-first for nothing that matters. For this app's needs that is not
much code. The app must fully boot with the network off.

**Rest timer caveat.** A 90 s timer cannot reliably run in a backgrounded browser tab — throttling
will drift it. Implementation: store the target timestamp, compute remaining time from wall clock on
every resume (so it's correct even if the tab froze), and fire a `Notification` from the service
worker at the deadline. It will be accurate on unlock even where it can't tick in the background.

---

## 5. The progression engine

The program's progression rules are the actual intellectual content of the app. They go in
`lib/progression/` as **pure, dependency-free functions** — no DB, no React, no dates-from-`now()`
passed implicitly. Everything they need arrives as arguments. That makes them exhaustively testable,
and they're where a bug would be most expensive (wrong weight on the bar).

Rules to encode, from §ПРАВИЛА ПРОГРЕСІЇ:

1. **+2 reps per week** per exercise; on reaching 15 reps → step up the weight ladder and reset to
   starting reps.
2. **Kettlebell swings:** 16 kg → 20 kg when 5×15 is comfortable (needs a subjective "was this easy?"
   input at set completion — a 3-state RPE tap, not a 1–10 scale).
3. **Pull-up bar:** hang ≥ 60 s *and* australian rows at 3×15 → unlock negative pull-ups.
4. **Dips bar:** 60 s hold → unlock negative dips.
5. **Week 3:** kettlebell deadlift is replaced by swings (`active_from_week` / `active_to_week`).

Declarative config on `program_exercises.progression`, interpreted by the engine:

```jsonc
{
  "type": "reps_then_weight",
  "repIncrement": 2,
  "cadence": "week",
  "repCap": 15,
  "weightLadderKg": [12, 16, 20],
  "unlocks": [
    { "when": { "metric": "duration_sec", "gte": 60 },
      "and": { "exercise": "australian-row", "sets": 3, "reps": 15 },
      "replaceWith": "negative-pull-up" }
  ]
}
```

Engine signature:

```ts
computeTargets(input: {
  programExercise: ProgramExercise
  state: ProgressionState | null
  history: SetLog[]        // completed sets for this exercise
  weekIndex: number        // 0-based week in the 42 days
}): { sets: number; reps: number; weightKg: number | null; variantSlug: string }
```

It runs **client-side against Dexie** so it works offline, and `progression_state` is a cache of its
output rather than the authority — meaning a rule fix recomputes correctly from history instead of
needing a data migration.

**Safety rules** (§ПРАВИЛА БЕЗПЕКИ) surface as UI, not logic: a pain flag on any set shows the
program's stop-this-exercise-today guidance; the low-back-pain-after-swings rule prompts reverting to
deadlifts. The app shows the program's own words. It does not invent training or medical advice.

---

## 6. Project structure

```
tracking-app/
├─ operation-6-weeks.md              # source of truth for program content
├─ PLAN.md
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (auth)/sign-in/
│  │  │  ├─ (app)/
│  │  │  │  ├─ page.tsx              # Today
│  │  │  │  ├─ session/[id]/         # Session runner
│  │  │  │  ├─ chain/                # 42-day grid
│  │  │  │  ├─ progress/
│  │  │  │  ├─ benchmarks/
│  │  │  │  └─ settings/
│  │  │  └─ layout.tsx
│  │  ├─ auth/callback/route.ts
│  │  └─ manifest.ts
│  ├─ features/                      # vertical slices, each owns its UI + queries
│  │  ├─ chain/  session/  progression/  benchmarks/  metrics/
│  │  ├─ auth/
│  │  └─ sync/
│  ├─ lib/
│  │  ├─ supabase/                   # browser + server clients, generated types
│  │  ├─ db/                         # Dexie schema, outbox, migrations
│  │  ├─ progression/                # pure engine + its tests
│  │  ├─ units/                      # SI ↔ display conversion
│  │  └─ program/                    # week/day math for the 42-day cycle
│  ├─ components/ui/                 # shadcn
│  └─ i18n/
│     ├─ routing.ts
│     └─ messages/{uk,en}.json
├─ supabase/
│  ├─ migrations/
│  └─ seed/                          # the 6-week program as SQL
├─ e2e/
└─ .github/workflows/ci.yml
```

Feature-sliced rather than layer-sliced (`components/`, `hooks/`, `utils/`): each feature folder
holds its own components, queries and types, so the offline sync work touches `features/sync/` and
`lib/db/` and nothing else.

---

## 7. Deployment & free-tier reality

**Vercel Hobby** — free, unlimited Next.js deploys, preview URLs per branch. Two constraints worth
knowing up front: it's licensed for **non-commercial use only** (fine here), and **cron jobs on Hobby
run at most once per day**.

**Supabase Free** — roughly 500 MB Postgres, 50k monthly active users, 2 active projects. Two things
matter for this app:

- **Free projects pause after ~7 days of inactivity.** For a daily-use app this is mostly moot, but
  a paused project needs a manual unpause from the dashboard, and it will bite during a slow week of
  development.
- Storage is far beyond what this app needs. Six weeks of set logs is on the order of kilobytes.

*Verify both tiers' current limits before building — free-tier terms change, and these numbers are
from my training data, not from checking today.*

**Pipeline:** GitHub → Vercel auto-deploy on push to `main`, preview deploys per PR. Supabase
migrations applied via `supabase db push` in a CI step gated on the migration files changing. Two
Supabase projects (dev + prod) if you want safety; one is workable for a solo personal app.

**Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon key is public by
design — RLS is what protects the data, which is why §8's RLS tests are not optional. The
`service_role` key must never appear in the Next.js app.

### Why push notifications are deferred to v2

A daily reminder is the single most valuable feature for a streak app, and it's also the one the free
web stack handles worst. On iOS, web push requires the PWA to be installed to the home screen
(iOS 16.4+), and the send side needs a scheduled job — but Vercel Hobby cron only fires once a day,
so per-user timezone-correct reminders need a Supabase Edge Function on `pg_cron` instead. That's a
real, self-contained chunk of work, and shipping it inside v1 would delay the thing that actually
matters: being able to log a workout tomorrow. v1 ships with the 42-day grid as the motivational
surface; reminders land in v2 once you know whether you need them.

---

## 8. Testing

Weighted toward where bugs are expensive, not toward coverage percentage:

- **Progression engine — Vitest, thorough.** Every rule from §5, including the week-3 swap, the
  rep-cap-to-weight-ladder transition, and both unlock conditions. Pure functions, so this is cheap
  and it's where a wrong answer means a wrong weight on the bar.
- **Sync engine — Vitest with fake-indexeddb.** Specifically: outbox replay after a simulated crash,
  idempotency of a retried upsert, LWW resolution, and soft-delete propagation.
- **RLS — tests against a remote dev project.** Assert that user A, authenticated, gets zero rows
  from every one of user B's tables. Run in CI on every migration change. This is the one test that
  guards a real security boundary rather than a correctness one. There is no Docker in this
  environment, so the local `supabase start` stack the plan originally assumed is unavailable — see
  [ADR 0003](decisions/0003-rls-tests-against-remote.md).
- **Playwright e2e — one path, run against a preview deploy:** sign in → complete the chain → run a
  Strength A session → verify next week's targets increased by 2 reps.
- **Manual, once, on a real phone:** enable airplane mode, log a full session, re-enable, confirm
  everything synced. No amount of fake-indexeddb testing substitutes for this.

---

## 9. Build phases

Ordered so that something usable exists early and the risky work happens with the domain already
understood.

| Phase | Scope | Exit criterion |
|---|---|---|
| **0. Foundation** | Next.js + TS + Tailwind + shadcn, i18n routing, CI, Vercel deploy | Empty app live at a URL, uk/en switching |
| **1. Data & auth** | Migrations, RLS policies + tests, Supabase Auth (magic link), generated types | Two test users provably cannot see each other's rows |
| **2. Program seed** | The 6-week program as seed SQL, week/day math, 42-day grid (read-only) | Grid renders the correct schedule from a start date |
| **3. Chain + Today** | Chain checklist, streak calculation, body metrics — **online only** | You can log the daily chain. *App is genuinely useful from here.* |
| **4. Session runner** | Set logging, rest timer, progression engine + its tests | You can run a full Strength A session with correct targets |
| **5. Offline layer** | Dexie, outbox, sync engine, service worker, install prompt | Airplane-mode test passes on a real phone |
| **6. Progress** | Charts, benchmark entry, start-vs-end comparison, JSON/CSV export | Day 0 numbers entered and displayed |
| **7. Polish** | Empty states, error handling, dead-letter UI, uk/en copy review, a11y pass on touch targets | — |

**Phase 3 is the first genuinely useful build** — the chain is the part of the program that must not
break, and it's the simplest thing in the app. If the 42 days start before the app is finished, log
the chain in it from phase 3 and keep sessions on paper until phase 4 lands.

Phases 3 and 4 deliberately ship **online-only**. Building the offline layer under a UI whose data
shape is already settled is far easier than building both at once, and the refactor is contained to
the query layer.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| **Sync layer overruns its phase** | It's isolated to phase 5 behind a settled data shape. If it slips, phases 1–4 are still a working online app. Ship that. |
| **Supabase free project pauses mid-development** | Expect it after quiet weeks; unpause from the dashboard. Not a data-loss event. |
| **RLS misconfiguration leaks data across users** | Automated cross-user RLS tests in CI, gated on migrations. The anon key is public — this is the boundary. |
| **iOS PWA limitations** (no Background Sync, install-gated push) | Designed around from the start: foreground-triggered sync, no push in v1, wall-clock rest timer. |
| **Manual step entry is friction the app can't remove** | Accepted. Web can't read Health data. One number, once a day. |
| **Scope creep into a general fitness tracker** | Schema is program-agnostic; the *app* runs one program. Resist adding a second until this 42-day cycle is finished. |
| **The app becomes a substitute for training** | The real risk in a project like this. Phase 3 exists specifically so the app is useful in week 1 rather than becoming a six-week build that replaces the six-week program. |

---

## 11. Open questions

- **Start date** — has day 0 happened? This determines whether phase 3 is urgent or comfortable.
- **Benchmark units** — 1.5 km walk time and hang/plank seconds are stored as seconds; confirm
  push-ups-from-bench and squats-per-minute are plain counts.
- **Timezone** — stored per `user_programs` so "today" is unambiguous while travelling. Confirm a
  single timezone is fine for now.
