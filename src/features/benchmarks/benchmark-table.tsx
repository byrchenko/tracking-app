"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  formatBenchmark,
  type BenchmarkComparison,
} from "@/lib/program/benchmarks";
import { cn } from "@/lib/utils";
import { saveBenchmark } from "./actions";

/**
 * The норматив table: seven tests, start vs week 6.
 *
 * Deliberately a table and not a chart. The seven tests are measured in
 * seconds, reps, kilograms and centimetres — there is no shared axis they could
 * honestly share, and the document itself presents them as a table.
 */
export function BenchmarkTable({
  userProgramId,
  rows,
  editablePhase,
}: {
  userProgramId: string;
  rows: BenchmarkComparison[];
  editablePhase: "start" | "end";
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.test.key,
        String((editablePhase === "start" ? r.start : r.end) ?? ""),
      ]),
    ),
  );

  function commit(testKey: string) {
    const value = Number.parseFloat(values[testKey] ?? "");
    if (!Number.isFinite(value)) return;
    startTransition(async () => {
      await saveBenchmark({ userProgramId, testKey, phase: editablePhase, value });
    });
  }

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{t("benchmarks.title")}</caption>
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted">
          <th scope="col" className="py-2 font-normal">{t("benchmarks.test")}</th>
          <th scope="col" className="py-2 text-right font-normal">{t("benchmarks.start")}</th>
          <th scope="col" className="py-2 text-right font-normal">{t("benchmarks.end")}</th>
          <th scope="col" className="py-2 text-right font-normal">{t("benchmarks.delta")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isEditable = true;
          const shown = values[row.test.key] ?? "";
          return (
            <tr key={row.test.key} className="border-b border-border/60">
              <th scope="row" className="py-2 pr-2 text-left font-normal">
                {t(`benchmarks.${row.test.key}`)}
                <span className="ml-1 text-xs text-muted">
                  {t(`units.${row.test.unit}`)}
                </span>
              </th>

              <td className="py-2 text-right tabular-nums">
                {editablePhase === "start" && isEditable ? (
                  <input
                    aria-label={`${t(`benchmarks.${row.test.key}`)} — ${t("benchmarks.start")}`}
                    type="number"
                    inputMode="decimal"
                    value={shown}
                    disabled={pending}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [row.test.key]: e.target.value }))
                    }
                    onBlur={() => commit(row.test.key)}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-base tabular-nums"
                  />
                ) : row.start !== null ? (
                  formatBenchmark(row.start, row.test.unit)
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>

              <td className="py-2 text-right tabular-nums">
                {editablePhase === "end" ? (
                  <input
                    aria-label={`${t(`benchmarks.${row.test.key}`)} — ${t("benchmarks.end")}`}
                    type="number"
                    inputMode="decimal"
                    value={shown}
                    disabled={pending}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [row.test.key]: e.target.value }))
                    }
                    onBlur={() => commit(row.test.key)}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-base tabular-nums"
                  />
                ) : row.end !== null ? (
                  formatBenchmark(row.end, row.test.unit)
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>

              <td
                className={cn(
                  "py-2 text-right tabular-nums",
                  row.improved === true && "text-accent",
                  row.improved === false && "text-danger",
                  row.improved === null && "text-muted",
                )}
              >
                {row.delta === null ? (
                  "—"
                ) : (
                  <>
                    {/* Direction, not just colour — the arrow says which way is
                        better for this specific test. */}
                    <span aria-hidden className="mr-0.5">
                      {row.improved === true ? "↑" : row.improved === false ? "↓" : "="}
                    </span>
                    <span className="sr-only">
                      {row.improved === true
                        ? t("benchmarks.improved")
                        : row.improved === false
                          ? t("benchmarks.worsened")
                          : t("benchmarks.unchanged")}
                    </span>
                    {row.delta > 0 ? "+" : ""}
                    {formatBenchmark(Math.abs(row.delta), row.test.unit)}
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
