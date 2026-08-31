import { describe, expect, it } from "vitest";
import {
  BENCHMARK_TESTS,
  compareBenchmarks,
  formatBenchmark,
} from "./benchmarks";

describe("benchmark definitions", () => {
  it("covers all seven tests from the program table", () => {
    expect(BENCHMARK_TESTS.map((t) => t.key)).toEqual([
      "walk_1500m",
      "bench_pushups",
      "squats_1min",
      "bar_hang",
      "plank",
      "body_weight",
      "waist",
    ]);
  });

  it("knows which tests improve by going down", () => {
    const lower = BENCHMARK_TESTS.filter((t) => t.lowerIsBetter).map((t) => t.key);
    expect(lower).toEqual(["walk_1500m", "body_weight", "waist"]);
  });
});

describe("compareBenchmarks", () => {
  it("pairs start and end results", () => {
    const [walk] = compareBenchmarks([
      { testKey: "walk_1500m", phase: "start", value: 900 },
      { testKey: "walk_1500m", phase: "end", value: 840 },
    ]);
    expect(walk).toMatchObject({ start: 900, end: 840, delta: -60 });
  });

  it("counts a faster walk as an improvement even though the number fell", () => {
    // A table that painted this as a regression would be actively misleading.
    const [walk] = compareBenchmarks([
      { testKey: "walk_1500m", phase: "start", value: 900 },
      { testKey: "walk_1500m", phase: "end", value: 840 },
    ]);
    expect(walk.improved).toBe(true);
  });

  it("counts a longer hang as an improvement", () => {
    const result = compareBenchmarks([
      { testKey: "bar_hang", phase: "start", value: 20 },
      { testKey: "bar_hang", phase: "end", value: 55 },
    ]).find((r) => r.test.key === "bar_hang");
    expect(result).toMatchObject({ delta: 35, improved: true });
  });

  it("counts weight loss as an improvement and weight gain as not", () => {
    const lost = compareBenchmarks([
      { testKey: "body_weight", phase: "start", value: 119 },
      { testKey: "body_weight", phase: "end", value: 112 },
    ]).find((r) => r.test.key === "body_weight");
    expect(lost?.improved).toBe(true);

    const gained = compareBenchmarks([
      { testKey: "body_weight", phase: "start", value: 119 },
      { testKey: "body_weight", phase: "end", value: 121 },
    ]).find((r) => r.test.key === "body_weight");
    expect(gained?.improved).toBe(false);
  });

  it("treats no change as neither improved nor worsened", () => {
    const same = compareBenchmarks([
      { testKey: "plank", phase: "start", value: 45 },
      { testKey: "plank", phase: "end", value: 45 },
    ]).find((r) => r.test.key === "plank");
    expect(same?.delta).toBe(0);
    expect(same?.improved).toBeNull();
  });

  it("leaves the delta null when only the start is recorded", () => {
    const partial = compareBenchmarks([
      { testKey: "plank", phase: "start", value: 45 },
    ]).find((r) => r.test.key === "plank");
    expect(partial).toMatchObject({ start: 45, end: null, delta: null, improved: null });
  });

  it("always returns a row per test, even with no results at all", () => {
    const rows = compareBenchmarks([]);
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.start === null && r.end === null)).toBe(true);
  });
});

describe("formatBenchmark", () => {
  it("formats seconds as m:ss once past a minute", () => {
    expect(formatBenchmark(900, "sec")).toBe("15:00");
    expect(formatBenchmark(845, "sec")).toBe("14:05");
  });

  it("leaves sub-minute times as plain seconds", () => {
    expect(formatBenchmark(45, "sec")).toBe("45");
  });

  it("passes other units through unchanged", () => {
    expect(formatBenchmark(119, "kg")).toBe("119");
    expect(formatBenchmark(28, "reps")).toBe("28");
  });
});
