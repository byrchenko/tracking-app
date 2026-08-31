/**
 * ДЕНЬ 0 — ВХІДНИЙ НОРМАТИВ, repeated on day 42.
 *
 * Transcribed from the program document's table. Values are stored in the
 * canonical unit for each test; the UI converts for display.
 */

export type BenchmarkUnit = "sec" | "reps" | "kg" | "cm";

export type BenchmarkTest = {
  key: string;
  unit: BenchmarkUnit;
  /** Whether a *lower* number is an improvement (a faster walk, a smaller waist). */
  lowerIsBetter: boolean;
};

export const BENCHMARK_TESTS: BenchmarkTest[] = [
  // "Ходьба 1.5 км (час)" — faster is better.
  { key: "walk_1500m", unit: "sec", lowerIsBetter: true },
  { key: "bench_pushups", unit: "reps", lowerIsBetter: false },
  { key: "squats_1min", unit: "reps", lowerIsBetter: false },
  { key: "bar_hang", unit: "sec", lowerIsBetter: false },
  { key: "plank", unit: "sec", lowerIsBetter: false },
  { key: "body_weight", unit: "kg", lowerIsBetter: true },
  { key: "waist", unit: "cm", lowerIsBetter: true },
];

export type BenchmarkComparison = {
  test: BenchmarkTest;
  start: number | null;
  end: number | null;
  delta: number | null;
  /** True when the change moved in the desired direction for this test. */
  improved: boolean | null;
};

/**
 * Pairs the day-0 and day-42 results.
 *
 * `improved` accounts for direction: shaving 40 seconds off the 1.5 km walk and
 * adding 40 seconds to the bar hang are both progress, and a table that showed
 * one as red would be actively misleading.
 */
export function compareBenchmarks(
  results: Array<{ testKey: string; phase: "start" | "end"; value: number }>,
): BenchmarkComparison[] {
  const byKey = new Map<string, { start?: number; end?: number }>();
  for (const r of results) {
    const entry = byKey.get(r.testKey) ?? {};
    entry[r.phase] = r.value;
    byKey.set(r.testKey, entry);
  }

  return BENCHMARK_TESTS.map((test) => {
    const found = byKey.get(test.key) ?? {};
    const start = found.start ?? null;
    const end = found.end ?? null;
    const delta = start !== null && end !== null ? end - start : null;

    let improved: boolean | null = null;
    if (delta !== null && delta !== 0) {
      improved = test.lowerIsBetter ? delta < 0 : delta > 0;
    } else if (delta === 0) {
      improved = null; // unchanged is neither
    }

    return { test, start, end, delta, improved };
  });
}

/** Seconds as `m:ss`; other units as plain numbers. */
export function formatBenchmark(value: number, unit: BenchmarkUnit): string {
  if (unit !== "sec") return String(value);
  const m = Math.floor(value / 60);
  const s = Math.round(value % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}`;
}
