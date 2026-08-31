"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CHAIN_STEP_TARGET, isChainComplete } from "@/lib/program/streak";
import { cn } from "@/lib/utils";
import { saveChainEntry } from "./actions";

type Entry = {
  steps: number;
  mobilityDone: boolean;
  hourlyWalks: number;
};

/**
 * The daily chain, three taps.
 *
 * Every control writes optimistically: the value updates locally and the server
 * call follows. Waiting on a round trip to tick a checkbox is the difference
 * between an app used daily and one abandoned in week two.
 */
export function ChainChecklist({
  date,
  initial,
}: {
  date: string;
  initial: Entry;
}) {
  const t = useTranslations("chain");
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState(initial);
  const [entry, setEntry] = useOptimistic(saved);
  const [stepsDraft, setStepsDraft] = useState(
    initial.steps > 0 ? String(initial.steps) : "",
  );
  const [failed, setFailed] = useState(false);

  function apply(patch: Partial<Entry>) {
    const next = { ...saved, ...patch };
    startTransition(async () => {
      setEntry(next);
      const result = await saveChainEntry({
        date,
        steps: patch.steps,
        mobilityDone: patch.mobilityDone,
        hourlyWalks: patch.hourlyWalks,
      });
      if (result.error) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setSaved(next);
    });
  }

  const complete = isChainComplete({
    steps: entry.steps,
    mobilityDone: entry.mobilityDone,
  });

  return (
    <section
      className={cn(
        "rounded-xl border p-4",
        complete ? "border-accent bg-accent/5" : "border-border bg-surface",
      )}
      aria-labelledby="chain-heading"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="chain-heading" className="text-sm font-medium">
          {t("title")}
        </h2>
        <span
          className={cn(
            "text-xs",
            complete ? "text-accent" : "text-muted",
          )}
        >
          {complete ? t("complete") : t("incomplete")}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="steps" className="text-sm">
            {t("steps")}
          </label>
          <p className="mb-1 text-xs text-muted">{t("stepsTarget")}</p>
          <input
            id="steps"
            type="number"
            inputMode="numeric"
            min={0}
            max={200000}
            placeholder="0"
            value={stepsDraft}
            onChange={(e) => setStepsDraft(e.target.value)}
            onBlur={() => {
              const parsed = Number.parseInt(stepsDraft, 10);
              const steps = Number.isNaN(parsed) ? 0 : parsed;
              if (steps !== saved.steps) apply({ steps });
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base tabular-nums"
          />
          <div
            className="mt-1 h-1 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={Math.min(entry.steps, CHAIN_STEP_TARGET)}
            aria-valuemin={0}
            aria-valuemax={CHAIN_STEP_TARGET}
          >
            <div
              className="h-full bg-accent transition-[width]"
              style={{
                width: `${Math.min(100, (entry.steps / CHAIN_STEP_TARGET) * 100)}%`,
              }}
            />
          </div>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={entry.mobilityDone}
            onChange={(e) => apply({ mobilityDone: e.target.checked })}
            className="mt-0.5 size-5 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-sm">{t("mobility")}</span>
            <span className="block text-xs text-muted">{t("mobilityHint")}</span>
          </span>
        </label>

        <div>
          <span className="block text-sm">{t("hourlyWalks")}</span>
          <span className="mb-2 block text-xs text-muted">
            {t("hourlyWalksHint")}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="-1"
              onClick={() =>
                apply({ hourlyWalks: Math.max(0, entry.hourlyWalks - 1) })
              }
              className="size-11 rounded-lg border border-border text-lg"
            >
              −
            </button>
            <span className="min-w-8 text-center text-lg tabular-nums">
              {entry.hourlyWalks}
            </span>
            <button
              type="button"
              aria-label="+1"
              onClick={() =>
                apply({ hourlyWalks: Math.min(24, entry.hourlyWalks + 1) })
              }
              className="size-11 rounded-lg border border-border text-lg"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {failed ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t("saveFailed")}
        </p>
      ) : null}
    </section>
  );
}
