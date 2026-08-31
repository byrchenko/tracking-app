"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * Google sign-in.
 *
 * Preferred over the magic link on a phone: one tap, nothing to type, no email
 * to wait for, and no rate limit. The OAuth redirect comes back to
 * `/auth/confirm` with `?code=`, which the callback already exchanges for a
 * session — the same PKCE path the magic link uses.
 */
export function GoogleButton() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);

    const supabase = createClient();
    const redirectTo = new URL("/auth/confirm", window.location.origin);
    redirectTo.searchParams.set("locale", locale);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    // On success the browser navigates away, so reaching here means it failed.
    if (error) {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-base font-medium disabled:opacity-60"
      >
        <svg aria-hidden viewBox="0 0 18 18" className="size-5">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        {pending ? t("redirecting") : t("continueWithGoogle")}
      </button>

      {failed ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t("errors.google_unavailable")}
        </p>
      ) : null}
    </div>
  );
}
