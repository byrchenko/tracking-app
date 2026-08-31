import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { safeNextPath } from "@/lib/safe-redirect";

type RedirectTarget = Parameters<typeof redirect>[0];

/**
 * Magic-link landing route.
 *
 * Supabase's JS client uses **PKCE** by default, so the emailed link goes to
 * Supabase's own `/auth/v1/verify`, which then redirects here with `?code=`.
 * That code is exchanged for a session against the verifier stored in this
 * browser — which is why a link opened in a *different* browser cannot work.
 *
 * The `token_hash` branch is kept for the case where the email template is
 * customised to point straight at this route (`{{ .TokenHash }}`), and for
 * email-change confirmations.
 *
 * This route lives outside `[locale]` and is excluded from the proxy matcher,
 * so next-intl never rewrites the URL Supabase was told to redirect to.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const requestedLocale = searchParams.get("locale");
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  // Supabase reports failures either as query params or — in the implicit
  // flow — as a URL fragment. Fragments never reach the server, so the
  // sign-in page also reads the hash client-side.
  const supabaseError =
    searchParams.get("error_code") ?? searchParams.get("error");
  if (supabaseError) {
    redirect(`/${locale}/sign-in?error=${encodeURIComponent(supabaseError)}`);
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!code && !tokenHash) {
    redirect(`/${locale}/sign-in?error=invalid_link`);
  }

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        type: (type ?? "email") as EmailOtpType,
        token_hash: tokenHash!,
      });

  if (error) {
    // An expired or already-used link is the common case here, not an attack.
    // Requesting a new link invalidates every earlier one, so clicking an older
    // email lands exactly here.
    redirect(`/${locale}/sign-in?error=otp_expired`);
  }

  redirect(safeNextPath(searchParams.get("next"), locale) as RedirectTarget);
}
