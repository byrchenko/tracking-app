# Development

## Prerequisites

- **Node 24.20.0** — pinned in `.nvmrc`. With nvm: `nvm use` in the project root.
  The toolchain also runs on Node 22.13+ (see `engines` in `package.json`); 24 is
  what CI uses.
- **npm** — the lockfile is npm's. Don't mix in pnpm/yarn.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) on `localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm run test` | Vitest unit tests, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:rls` | Cross-user RLS tests against the real Supabase project |
| `npm run typegen` | Regenerate `PageProps`/`LayoutProps` route types |
| `npm run check` | typecheck + lint + unit tests, as CI runs them |

### `npm run typegen`

Next 16 generates the global `PageProps<'/route'>` and `LayoutProps<'/route'>`
type helpers from your route tree. `npm run build` does this automatically, but a
bare `npm run typecheck` on a clean checkout will fail without it — which is why
CI runs `npx next typegen` before typechecking.

## Local Playwright setup

Playwright's Chromium needs system libraries that must be installed with root:

```bash
sudo npx playwright install-deps chromium
npx playwright install chromium
```

Without the first command you'll get `error while loading shared libraries:
libXcomposite.so.1`. CI installs these itself via `playwright install --with-deps`.

There is no Docker in this environment, so there is no local Supabase stack —
see [`decisions/0003-rls-tests-against-remote.md`](decisions/0003-rls-tests-against-remote.md)
for how RLS is tested instead.

## RLS test fixtures

`npm run test:rls` signs in as two real accounts and asserts neither can see
the other's rows. To set them up in a new environment:

1. Pick a password and add it to `.env.local` as `RLS_TEST_PASSWORD`.
2. Run `supabase/seed/rls_test_users.sql` in the Supabase SQL Editor,
   substituting that password for the placeholder.
3. Add `RLS_TEST_EMAIL_A` and `RLS_TEST_EMAIL_B` to `.env.local`.

The suite **skips itself** when those variables are absent, so a fresh
checkout and fork PRs stay green without access to the project.

The tests never use a `service_role` key — they run as ordinary authenticated
users through PostgREST, the same path a real browser takes. A test that could
bypass RLS would prove nothing about RLS.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API (Project URL), e.g. `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Settings → API Keys → **Publishable key** (`sb_publishable_…`). **Public by design** — RLS is what protects the data. |

Supabase is migrating from the legacy JWT key pair (`anon` / `service_role`) to
`sb_publishable_…` / `sb_secret_…`, with the legacy keys deprecated at the end of
2026. Use the publishable key; a legacy `anon` key works identically if that's
what your dashboard shows.

**Never put the secret key (`sb_secret_…` / `service_role`) in this app.** It
bypasses RLS entirely, and anything prefixed `NEXT_PUBLIC_` is shipped to the
browser.

## Project layout

See [`architecture.md`](architecture.md).

## Conventions

- **Units are stored SI**: kilograms, centimetres, metres, seconds. Convert at
  display time only. This keeps the progression math unit-free.
- **Dates are `yyyy-MM-dd` strings**, not `Date` objects, anywhere they represent
  a calendar day. A workout happened on a date, not at an instant.
- **Pure logic goes in `src/lib/`** and gets unit tests. Anything that touches
  React, the network or IndexedDB goes in `src/features/`.
