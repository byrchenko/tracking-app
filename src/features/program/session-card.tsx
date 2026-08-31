import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { DayType } from "@/lib/program/schedule";
import { cn } from "@/lib/utils";

type LocalisedName = { uk?: string; en?: string };

/**
 * What today's training is, read from the seeded program rather than hardcoded,
 * so the card follows the document via the database.
 */
export async function SessionCard({
  dayType,
  week,
  locale,
}: {
  dayType: DayType;
  week: number;
  locale: string;
}) {
  const t = await getTranslations();
  const supabase = await createClient();

  const { data } = await supabase
    .from("program_exercises")
    .select(
      "order_index, target_sets, target_reps, target_weight_kg, target_seconds, target_distance_m, per_side, active_from_week, active_to_week, exercises(slug, name), program_days!inner(day_type)",
    )
    .eq("program_days.day_type", dayType)
    .order("order_index");

  // Only the prescriptions active this week — this is what makes the week-3
  // deadlift→swing swap appear on its own.
  const active = (data ?? []).filter(
    (row) =>
      row.active_from_week <= week &&
      (row.active_to_week === null || row.active_to_week >= week),
  );

  const isRest = dayType === "rest";

  return (
    <section
      className={cn(
        "rounded-xl border border-border p-4",
        isRest ? "bg-transparent" : "bg-surface",
      )}
      aria-labelledby="session-heading"
    >
      <h2 id="session-heading" className="mb-3 text-sm font-medium">
        {t(`days.${dayType}`)}
      </h2>

      {active.length === 0 ? (
        <p className="text-sm text-muted">{t("session.nothingScheduled")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((row) => {
            const name = (row.exercises?.name ?? {}) as LocalisedName;
            const label =
              (locale === "en" ? name.en : name.uk) ?? row.exercises?.slug ?? "";

            const scheme = [
              row.target_sets,
              row.target_reps ??
                (row.target_seconds ? `${row.target_seconds}${t("units.sec")}` : null) ??
                (row.target_distance_m ? `${row.target_distance_m}${t("units.m")}` : null) ??
                t("session.max"),
            ]
              .filter(Boolean)
              .join("×");

            return (
              <li
                key={`${row.order_index}-${row.active_from_week}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span>{label}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {scheme}
                  {row.per_side ? ` ${t("session.perSide")}` : ""}
                  {row.target_weight_kg
                    ? ` · ${Number(row.target_weight_kg)}${t("units.kg")}`
                    : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
