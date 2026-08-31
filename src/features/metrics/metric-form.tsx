"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveBodyMetrics } from "./actions";

export function MetricForm({
  date,
  initial,
}: {
  date: string;
  initial: { weightKg: number | null; waistCm: number | null };
}) {
  const t = useTranslations("progress");
  const [pending, startTransition] = useTransition();
  const [weight, setWeight] = useState(initial.weightKg?.toString() ?? "");
  const [waist, setWaist] = useState(initial.waistCm?.toString() ?? "");
  const [saved, setSaved] = useState(false);

  function commit() {
    startTransition(async () => {
      const result = await saveBodyMetrics({
        date,
        weightKg: weight === "" ? null : Number.parseFloat(weight),
        waistCm: waist === "" ? null : Number.parseFloat(waist),
      });
      setSaved(!result.error);
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium">{t("todayMeasurements")}</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-muted">
          {t("weight")}
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setSaved(false); }}
            onBlur={commit}
            className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-base tabular-nums"
          />
        </label>
        <label className="flex flex-col text-xs text-muted">
          {t("waist")}
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={waist}
            onChange={(e) => { setWaist(e.target.value); setSaved(false); }}
            onBlur={commit}
            className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-base tabular-nums"
          />
        </label>
        {saved && !pending ? (
          <span aria-live="polite" className="pb-2 text-xs text-accent">
            {t("saved")}
          </span>
        ) : null}
      </div>
    </section>
  );
}
