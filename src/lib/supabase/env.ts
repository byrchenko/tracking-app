/**
 * Supabase connection details.
 *
 * `NEXT_PUBLIC_*` variables are inlined at build time, so they must be
 * referenced as complete literals — `process.env[name]` would not be replaced
 * and would read as undefined in the browser.
 *
 * The publishable key is public by design: it ships to every client, and Row
 * Level Security is what actually protects the data.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in — see docs/development.md.`,
    );
  }
  return value;
}

export function supabaseEnv() {
  return {
    url: required(url, "NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required(
      publishableKey,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  };
}

/** True when both variables are present, without throwing. Used by tests to skip. */
export function hasSupabaseEnv(): boolean {
  return Boolean(url && publishableKey);
}
