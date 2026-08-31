"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WeekBar = { week: number; complete: number; elapsed: number };

/**
 * Days the chain held, per program week.
 *
 * The single most important number in this app — the program's own rule is that
 * the chain, not the training, is what you are defending. Bars are capped at the
 * days that have actually elapsed, so an in-progress week reads 3/3 rather than
 * looking like a failed 3/7.
 *
 * One series, one colour. Colouring bars darker-where-bigger would double-encode
 * height as hue and burn the only free channel on information already shown.
 */
export function ChainWeeksChart({ data }: { data: WeekBar[] }) {
  const t = useTranslations("progress");
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const total = data.reduce((sum, w) => sum + w.complete, 0);
  const elapsed = data.reduce((sum, w) => sum + w.elapsed, 0);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{t("chainByWeek")}</h3>
        <p className="text-lg">
          {total}
          <span className="text-muted">/{elapsed}</span>
        </p>
      </header>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
              stroke="var(--chart-grid)"
            />
            <YAxis
              domain={[0, 7]}
              ticks={[0, 7]}
              tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
              stroke="var(--chart-grid)"
              width={36}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              formatter={(value, _name, item) => [
                `${String(value)}/${(item?.payload as WeekBar)?.elapsed ?? 7}`,
                t("daysComplete"),
              ]}
              labelFormatter={(week) => t("week", { week: String(week) })}
            />
            {/* 4px rounded data-end, anchored to the baseline. */}
            <Bar dataKey="complete" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((w) => (
                <Cell key={w.week} fill="var(--accent)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button
        type="button"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable((v) => !v)}
        className="mt-2 text-xs text-muted underline"
      >
        {showTable ? t("hideTable") : t("showTable")}
      </button>

      {showTable ? (
        <table id={tableId} className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-1 font-normal">{t("weekLabel")}</th>
              <th scope="col" className="py-1 text-right font-normal">{t("daysComplete")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((w) => (
              <tr key={w.week} className="border-t border-border/60">
                <td className="py-1 tabular-nums">{w.week}</td>
                <td className="py-1 text-right tabular-nums">
                  {w.complete}/{w.elapsed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
