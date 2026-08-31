"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SessionExercise } from "./queries";
import { logSet } from "./actions";
import { cn } from "@/lib/utils";

const RPE_OPTIONS = ["easy", "ok", "hard"] as const;

/**
 * One exercise: its target, its logged sets, and the inputs to add the next one.
 *
 * Which inputs appear is driven by the exercise's `metric_type`, so a hold asks
 * for seconds and a carry asks for distance rather than everything asking for
 * reps.
 */
export function SetLogger({
  sessionId,
  exercise,
}: {
  sessionId: string;
  exercise: SessionExercise;
}) {
  const t = useTranslations("session");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [sets, setSets] = useState(exercise.loggedSets);
  const [failed, setFailed] = useState(false);

  const { target, metricType } = exercise;
  const name = (locale === "en" ? exercise.name.en : exercise.name.uk) ?? exercise.slug;
  const cue = exercise.cues
    ? (locale === "en" ? exercise.cues.en : exercise.cues.uk)
    : null;

  const [reps, setReps] = useState(target.reps ? String(target.reps) : "");
  const [weight, setWeight] = useState(target.weightKg ? String(target.weightKg) : "");
  const [duration, setDuration] = useState(target.seconds ? String(target.seconds) : "");
  const [rpe, setRpe] = useState<(typeof RPE_OPTIONS)[number] | null>(null);
  const [pain, setPain] = useState(false);

  const nextIndex = sets.length + 1;
  const wantsReps = metricType === "reps" || metricType === "reps_weight";
  const wantsWeight = metricType === "reps_weight" || metricType === "distance_weight";
  const wantsDuration = metricType === "time";

  function submit() {
    startTransition(async () => {
      const parsed = {
        reps: wantsReps ? Number.parseInt(reps, 10) || null : null,
        weightKg: wantsWeight ? Number.parseFloat(weight) || null : null,
        durationSec: wantsDuration ? Number.parseInt(duration, 10) || null : null,
        distanceM: target.distanceM,
      };

      const result = await logSet({
        sessionId,
        exerciseId: exercise.exerciseId,
        setIndex: nextIndex,
        ...parsed,
        rpe,
        painFlag: pain,
      });

      if (result.error) {
        setFailed(true);
        return;
      }

      setFailed(false);
      setSets((prev) => [
        ...prev,
        { id: `local-${nextIndex}`, setIndex: nextIndex, ...parsed, rpe, painFlag: pain },
      ]);
      setRpe(null);
      setPain(false);
    });
  }

  const complete = sets.length >= target.sets;

  return (
    <section
      className={cn(
        "rounded-xl border p-4",
        complete ? "border-accent bg-accent/5" : "border-border bg-surface",
      )}
    >
      <header className="mb-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium">{name}</h3>
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {sets.length}/{target.sets}
          </span>
        </div>
        <p className="text-xs text-muted">
          {target.sets}×{target.reps ?? (target.seconds ? `${target.seconds}${t("sec")}` : t("max"))}
          {target.perSide ? ` ${t("perSide")}` : ""}
          {target.weightKg ? ` · ${target.weightKg}${t("kg")}` : ""}
        </p>
        {cue ? <p className="mt-1 text-xs text-muted italic">{cue}</p> : null}
      </header>

      {/* Progression suggestions are offered, never applied silently. */}
      {target.readyToStepUp ? (
        <p className="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-xs">
          {t("readyToStepUp", { weight: target.readyToStepUp.toWeightKg })}
        </p>
      ) : null}
      {target.unlockAvailable ? (
        <p className="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-xs">
          {t("unlockAvailable")}
        </p>
      ) : null}

      {sets.length > 0 ? (
        <ol className="mb-3 flex flex-wrap gap-2">
          {sets.map((s) => (
            <li
              key={s.id}
              className={cn(
                "rounded-md border px-2 py-1 text-xs tabular-nums",
                s.painFlag ? "border-danger text-danger" : "border-border text-muted",
              )}
            >
              {s.reps ?? s.durationSec ?? "—"}
              {s.weightKg ? `×${s.weightKg}` : ""}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        {wantsReps ? (
          <label className="flex flex-col text-xs text-muted">
            {t("reps")}
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-base tabular-nums"
            />
          </label>
        ) : null}

        {wantsWeight ? (
          <label className="flex flex-col text-xs text-muted">
            {t("weight")}
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-base tabular-nums"
            />
          </label>
        ) : null}

        {wantsDuration ? (
          <label className="flex flex-col text-xs text-muted">
            {t("seconds")}
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-base tabular-nums"
            />
          </label>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {t("logSet")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1" role="group" aria-label={t("effort")}>
          {RPE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={rpe === option}
              onClick={() => setRpe(rpe === option ? null : option)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                rpe === option
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted",
              )}
            >
              {t(`rpe.${option}`)}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={pain}
            onChange={(e) => setPain(e.target.checked)}
            className="size-4 accent-[var(--danger)]"
          />
          {t("pain")}
        </label>
      </div>

      {pain ? (
        <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {t("painHint")}
        </p>
      ) : null}

      {failed ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t("saveFailed")}
        </p>
      ) : null}
    </section>
  );
}
