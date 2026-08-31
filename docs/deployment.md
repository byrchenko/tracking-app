# Deployment

Vercel builds from the `main` branch. Day-to-day work lands on `develop`; merging
`develop` → `main` is what ships.

## One-time setup

### 1. Environment variables (Vercel → Settings → Environment Variables)

Add both, for **Production, Preview and Development**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://iyutjcsvkmunewztgwkr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key from Supabase → Settings → API Keys |

Both are public by design — they ship to the browser, and Row Level Security is
what protects the data. **Never add the `sb_secret_…` / `service_role` key**; it
bypasses RLS entirely and has no use in this app.

Without these the app builds fine but every page fails at runtime. The error
boundary says so explicitly rather than showing a stack trace, so if you see
"The app isn't connected to its database", this is the fix.

### 2. Supabase redirect URLs — the step that is always missed

**Supabase Dashboard → Authentication → URL Configuration:**

- **Site URL:** `https://<your-app>.vercel.app`
- **Redirect URLs:** add both
  - `https://<your-app>.vercel.app/**`
  - `http://localhost:3000/**` (for local development)

Magic-link sign-in **fails silently** without this — the email arrives, the link
looks right, and clicking it lands you back at sign-in with no explanation.
Supabase refuses to redirect to an origin that is not on the allowlist.

Vercel preview deployments get a new URL per branch, so add
`https://<project>-*.vercel.app/**` if you want magic links to work on previews.

### 3. Database

The schema already lives in the Supabase project. For a *new* environment, apply
`supabase/migrations/*.sql` in order, then run `supabase/seed/001_operation_base.sql`
to load the program.

## Shipping a change

```bash
git checkout develop        # work here
# ... commits ...
git checkout main
git merge develop
git push origin main        # Vercel deploys
```

semantic-release runs on both branches: `main` cuts `1.2.0`, `develop` cuts
`1.2.0-beta.1`.

## What is not deployed yet

- **Offline support** — phase 5, deferred. The app needs a connection; a dead
  spot mid-workout loses that entry.
- **Push reminders** — v2. iOS gates web push behind home-screen install, and
  Vercel Hobby cron only fires once a day, so per-user timezone reminders need a
  Supabase Edge Function on `pg_cron`.

## Free-tier limits worth knowing

- **Vercel Hobby** is non-commercial use only, and its cron jobs run at most once
  per day.
- **Supabase free projects pause after ~7 days of inactivity** and need a manual
  unpause from the dashboard. Daily use makes this mostly moot, but it will bite
  after a quiet stretch.

Verify both against current pricing pages rather than trusting this file.
