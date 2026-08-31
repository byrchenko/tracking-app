# Architecture

How the code is organized and why. For the *intended* design ahead of the current
build, see [`plan.md`](plan.md); this file describes what exists.

**Build status:** phases 0 (foundation) and 1 (data model, RLS, auth) complete.
Phases 2–6 pending — see the phase table in `plan.md`.

## Layout

```
src/
├─ app/
│  ├─ globals.css              Tailwind v4 theme tokens + touch-target floor
│  └─ [locale]/
│     ├─ layout.tsx            Root layout (<html>), font, NextIntlClientProvider
│     └─ page.tsx              Today screen
├─ components/                 Shared presentational components
├─ features/                   Vertical slices (chain, session, progression, …)
├─ lib/
│  ├─ program/schedule.ts      42-day calendar math — pure, tested
│  ├─ supabase/
│  │  ├─ client.ts            Browser client
│  │  ├─ server.ts            Per-request server client (async cookies)
│  │  ├─ proxy.ts             Session refresh, called from src/proxy.ts
│  │  ├─ env.ts               Validated env access
│  │  ├─ database.types.ts    Generated from the schema
│  │  └─ rls.rls.test.ts      Cross-user RLS tests
│  └─ utils.ts                 `cn()` class merge helper
├─ i18n/
│  ├─ routing.ts               Locale list, default locale
│  ├─ navigation.ts            Locale-aware Link/router
│  ├─ request.ts               Server-side message loading
│  └─ messages/{uk,en}.json    Translation catalogues
└─ proxy.ts                    Locale negotiation + redirect (Next 16 `proxy`)
```

Feature-sliced rather than layer-sliced: each feature folder owns its components,
queries and types. When the offline sync layer lands (phase 5) it should touch
`features/sync/` and `lib/db/` and nothing else.

## Why `src/proxy.ts` and not `middleware.ts`

Next.js 16 renamed the `middleware` file convention to `proxy`, with a named
`proxy` export and a Node.js-only runtime. next-intl still exports its handler as
`createMiddleware` — only the file and export names moved, so the two names
coexist in that file on purpose.

## Locale handling

Every route lives under `app/[locale]/`, and `proxy.ts` redirects a bare `/` to
the negotiated locale. `generateStaticParams` in the locale layout means both
`/uk` and `/en` prerender as static HTML at build time.

Ukrainian is the default locale because the program document is Ukrainian —
keeping the app in the source language avoids drift between spec and UI. English
is a full second locale, not a fallback.

The `Inter` font is loaded with both `latin` and `cyrillic` subsets. Dropping the
Cyrillic subset silently degrades every Ukrainian string to a fallback font.

## The 42-day schedule

`lib/program/schedule.ts` turns a start date into the program calendar. Two
decisions in there are load-bearing:

**A/B alternation is counted, not derived from the week number.** The program
specifies week 1 = А/Б/А, week 2 = Б/А/Б, "і далі по колу" — one continuous
A,B,A,B,… sequence across all 18 strength slots. Counting elapsed strength days
keeps that correct even when the program doesn't start on a Monday; deriving it
from `weekIndex % 2` would break on a mid-week start.

**Day types come from the calendar weekday**, so Mon/Wed/Fri are always strength
days and Sunday is always rest, matching the program's Пн–Нд table.

## Auth

Passwordless magic link. `src/app/auth/confirm/route.ts` exchanges the emailed
`token_hash` for a session; it lives **outside** `[locale]` and is excluded from
the proxy matcher so next-intl never rewrites the URL Supabase was told to
redirect to.

Its `next` parameter is attacker-controlled, so it is validated to be a
same-origin absolute path — including rejecting `//host` and `/\host`, which
start with a slash but resolve to another origin.

Session refresh happens in `src/proxy.ts`. Server Components cannot set
cookies, so the proxy is the only place a rotated token actually gets
persisted; without it sessions expire mid-use and produce random logouts.
The proxy composes with next-intl by mutating the response next-intl returns
rather than building a new one, so a locale redirect still carries auth
cookies.

## Testing strategy

Weighted toward where a bug is expensive rather than toward coverage:

- **`lib/` pure functions** — thorough Vitest coverage. `schedule.ts` has 15
  tests. The progression engine (phase 4) gets the same treatment, because a
  wrong answer there means a wrong weight on the bar.
- **RLS policies** — cross-user tests are the one test guarding a real security
  boundary, since the anon key is public and RLS is the only thing between users.
- **E2E** — one critical path, run against a real build on a mobile viewport.

## Known constraints

| Constraint | Consequence |
|---|---|
| No Docker in the dev environment | No local Supabase stack; RLS tested against a remote dev project |
| Playwright system libs need root | Local e2e requires a one-time `sudo playwright install-deps` |
| Turbopack is Next 16's default builder | `@serwist/next` is webpack-based and will likely not work; phase 5 probably needs a hand-written service worker |
| Web can't read Apple Health / Health Connect | Daily step count is a manual number entry |
| Safari has no Background Sync API | All sync is foreground-triggered; never show "saved" state that implies server acknowledgement |
