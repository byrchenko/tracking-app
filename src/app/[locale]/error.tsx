"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Route-level error boundary.
 *
 * The most likely production failure is a missing Supabase environment
 * variable, which otherwise surfaces as an unexplained 500. This says what to
 * check instead of showing a stack trace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  const misconfigured = error.message.includes("NEXT_PUBLIC_SUPABASE");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="mb-2 text-xl font-semibold">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted">
        {misconfigured ? t("misconfigured") : t("generic")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-accent px-4 py-2 text-base font-medium text-accent-fg"
      >
        {t("retry")}
      </button>
    </main>
  );
}
