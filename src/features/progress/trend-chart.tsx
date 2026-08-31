"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = { date: string; value: number | null };

/**
 * A single-series trend over the 42 days.
 *
 * One series, so there is no legend — the heading names it. Weight and waist
 * get *separate* charts rather than a dual axis: two y-scales on one plot invent
 * a correlation that isn't in the data.
 *
 * Every chart ships a table view. A tooltip enhances, it never gates: the value
 * has to be reachable without hovering.
 */
export function TrendChart({
  title,
  unit,
  data,
  domainPadding = 1,
}: {
  title: string;
  unit: string;
  data: TrendPoint[];
  domainPadding?: number;
}) {
  const t = useTranslations("progress");
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const points = data.filter((d) => d.value !== null) as Array<{
    date: string;
    value: number;
  }>;

  if (points.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-1 text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted">{t("noData")}</p>
      </section>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values) - domainPadding;
  const max = Math.max(...values) + domainPadding;
  const latest = points[points.length - 1];
  const first = points[0];
  const change = latest.value - first.value;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {/* Hero figure: proportional digits, not tabular — equal-width digits
            read loose at display sizes. */}
        <p className="text-lg">
          {latest.value}
          <span className="ml-1 text-xs text-muted">{unit}</span>
          {points.length > 1 ? (
            <span className="ml-2 text-xs text-muted">
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}
            </span>
          ) : null}
        </p>
      </header>

      {/* Height includes the x-axis band so the axis labels are never clipped
          into a nested scroll. */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeWidth={1}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
              tickFormatter={(d: string) => d.slice(5)}
              stroke="var(--chart-grid)"
              minTickGap={24}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
              stroke="var(--chart-grid)"
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              labelStyle={{ color: "var(--muted)" }}
              formatter={(value) => [`${String(value)} ${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2}
              // >=8px markers so the hit target is reachable on a phone.
              dot={{ r: 4, fill: "var(--accent)", strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
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
        <div id={tableId} className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th scope="col" className="py-1 font-normal">{t("date")}</th>
                <th scope="col" className="py-1 text-right font-normal">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-border/60">
                  <td className="py-1 tabular-nums">{p.date}</td>
                  <td className="py-1 text-right tabular-nums">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
