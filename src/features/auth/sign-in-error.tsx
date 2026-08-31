"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const KNOWN = new Set([
  "invalid_link",
  "otp_expired",
  "access_denied",
  "pkce_verifier_missing",
]);

/** The URL fragment is an external value, so it is read through a store rather
 *  than mirrored into state inside an effect. */
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => "";

/**
 * Shows why a sign-in link failed.
 *
 * Supabase reports implicit-flow failures in the URL **fragment**, which is
 * never sent to the server — so a server component cannot see it at all. The
 * hash is left in place deliberately: on a refresh the message ("that link
 * expired, request a new one") is still true and still useful.
 */
export function SignInError({ initialError }: { initialError?: string }) {
  const t = useTranslations("auth.errors");
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const fromHash = hash
    ? (new URLSearchParams(hash.slice(1)).get("error_code") ??
      new URLSearchParams(hash.slice(1)).get("error"))
    : null;

  const code = fromHash ?? initialError ?? null;
  if (!code) return null;

  return (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger"
    >
      {t(KNOWN.has(code) ? code : "generic")}
    </p>
  );
}
