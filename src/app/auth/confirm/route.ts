import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

type RedirectTarget = Parameters<typeof redirect>[0];

/**
 * `next` arrives from a query parameter, so it is attacker-controlled: a
 * sign-in link could be crafted with `next=https://evil.example` and would
 * bounce a freshly-authenticated user off-site. Only same-origin absolute
 * paths are allowed through.
 *
 * `//evil.example` and `/\evil.example` are rejected explicitly — both are
 * protocol-relative URLs that browsers resolve to a different origin despite
 * starting with a slash.
 */
function safeNext(next: string | null, locale: string): RedirectTarget {
  const fallback = `/${locale}` as RedirectTarget;
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next as RedirectTarget;
}

/**
 * Magic-link landing route.
 *
 * Supabase emails a link pointing here with `token_hash` and `type`. Exchanging
 * the hash for a session sets the auth cookies, after which the user is sent on
 * to the app.
 *
 * This route lives outside `[locale]` and is excluded from the proxy matcher,
 * so next-intl never rewrites the URL Supabase was told to redirect to.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const requestedLocale = searchParams.get("locale");
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  if (!tokenHash || !type) {
    redirect(`/${locale}/sign-in?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // An expired or already-used link is the common case here, not an attack.
    redirect(`/${locale}/sign-in?error=expired_link`);
  }

  redirect(safeNext(searchParams.get("next"), locale));
}
