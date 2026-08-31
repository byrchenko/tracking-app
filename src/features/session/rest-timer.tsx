"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DEFAULT_REST_SECONDS,
  formatRemaining,
  remainingSeconds,
  restDeadline,
} from "@/lib/progression/rest-timer";

/**
 * "Відпочинок між підходами 90 сек."
 *
 * Nothing counts down internally — a deadline is stored and the remaining time
 * is recomputed from the wall clock on every tick and whenever the tab becomes
 * visible again. A locked phone throttles or stops intervals, so a decrementing
 * counter would drift; this stays correct on wake.
 */
export function RestTimer({ seconds = DEFAULT_REST_SECONDS }: { seconds?: number }) {
  const t = useTranslations("session");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (deadline === null) return;

    const sync = () => {
      const left = remainingSeconds(deadline, Date.now());
      setRemaining(left);
      if (left === 0) setDeadline(null);
    };

    sync();
    const id = window.setInterval(sync, 500);
    // Recompute immediately on wake rather than waiting for the next tick.
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [deadline]);

  const running = deadline !== null;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() =>
          setDeadline(running ? null : restDeadline(Date.now(), seconds))
        }
        className="rounded-lg border border-border px-3 py-2 text-sm"
      >
        {running ? t("stopRest") : t("startRest")}
      </button>
      <span
        aria-live="polite"
        className="text-lg tabular-nums"
      >
        {running ? formatRemaining(remaining) : formatRemaining(seconds)}
      </span>
    </div>
  );
}
