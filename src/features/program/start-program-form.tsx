"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toDateString } from "@/lib/program/schedule";
import { startProgram } from "./actions";

/**
 * The program's weekly table runs Пн–Нд, so a Monday start makes the calendar
 * line up with it. Starting mid-week still works — the A/B alternation is
 * counted rather than derived from the weekday — but the default nudges toward
 * the coming Monday.
 */
function nextMonday(from = new Date()): string {
  const d = new Date(from);
  const daysUntilMonday = (8 - (d.getDay() || 7)) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return toDateString(d);
}

export function StartProgramForm() {
  const t = useTranslations("program");
  const [startDate, setStartDate] = useState(nextMonday);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await startProgram(formData);
          setError(result?.error ?? null);
        })
      }
      className="flex flex-col gap-3"
    >
      <label htmlFor="startDate" className="text-sm font-medium">
        {t("startDate")}
      </label>
      <input
        id="startDate"
        name="startDate"
        type="date"
        required
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-base"
      />
      <p className="text-xs text-muted">{t("startDateHint")}</p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-base font-medium text-accent-fg disabled:opacity-60"
      >
        {pending ? t("starting") : t("start")}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {t("startFailed")}
        </p>
      ) : null}
    </form>
  );
}
