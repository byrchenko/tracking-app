import { describe, expect, it } from "vitest";
import {
  CHAIN_STEP_TARGET,
  currentStreak,
  isChainComplete,
  longestStreak,
  weekProgress,
  type ChainDay,
} from "./streak";

function days(spec: Record<string, boolean>): ChainDay[] {
  return Object.entries(spec).map(([date, isComplete]) => ({ date, isComplete }));
}

describe("isChainComplete", () => {
  it("requires both 7000 steps and the mobility work", () => {
    expect(isChainComplete({ steps: 7000, mobilityDone: true })).toBe(true);
    expect(isChainComplete({ steps: 9999, mobilityDone: false })).toBe(false);
    expect(isChainComplete({ steps: 6999, mobilityDone: true })).toBe(false);
  });

  it("treats exactly the target as met, not missed", () => {
    expect(CHAIN_STEP_TARGET).toBe(7000);
    expect(isChainComplete({ steps: CHAIN_STEP_TARGET, mobilityDone: true })).toBe(true);
  });
});

describe("currentStreak", () => {
  it("counts consecutive complete days ending today", () => {
    const history = days({
      "2024-01-01": true,
      "2024-01-02": true,
      "2024-01-03": true,
    });
    expect(currentStreak(history, "2024-01-03")).toBe(3);
  });

  it("does not break the streak when today is not done yet", () => {
    // The day is not over. Showing 0 at 9am because the steps aren't logged
    // would be both wrong and demoralising.
    const history = days({
      "2024-01-01": true,
      "2024-01-02": true,
      "2024-01-03": false,
    });
    expect(currentStreak(history, "2024-01-03")).toBe(2);
  });

  it("breaks the streak when yesterday was missed", () => {
    const history = days({
      "2024-01-01": true,
      "2024-01-02": false,
      "2024-01-03": true,
    });
    expect(currentStreak(history, "2024-01-03")).toBe(1);
  });

  it("returns 0 when both today and yesterday were missed", () => {
    const history = days({
      "2024-01-01": true,
      "2024-01-02": false,
      "2024-01-03": false,
    });
    expect(currentStreak(history, "2024-01-03")).toBe(0);
  });

  it("ignores days with no entry at all", () => {
    // A day never logged is a broken chain, same as a logged incomplete day.
    const history = days({ "2024-01-01": true, "2024-01-03": true });
    expect(currentStreak(history, "2024-01-03")).toBe(1);
  });

  it("returns 0 for an empty history", () => {
    expect(currentStreak([], "2024-01-03")).toBe(0);
  });

  it("counts a full 42-day run", () => {
    const history: ChainDay[] = Array.from({ length: 42 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      isComplete: true,
    })).filter((d) => d.date <= "2024-01-31");

    expect(currentStreak(history, "2024-01-31")).toBe(31);
  });
});

describe("longestStreak", () => {
  it("finds the longest run anywhere in the history", () => {
    const history = days({
      "2024-01-01": true,
      "2024-01-02": true,
      "2024-01-03": true,
      "2024-01-04": false,
      "2024-01-05": true,
      "2024-01-06": true,
    });
    expect(longestStreak(history)).toBe(3);
  });

  it("treats a gap in dates as a break, not just an incomplete day", () => {
    const history = days({ "2024-01-01": true, "2024-01-05": true });
    expect(longestStreak(history)).toBe(1);
  });

  it("returns 0 when nothing was completed", () => {
    expect(longestStreak(days({ "2024-01-01": false }))).toBe(0);
    expect(longestStreak([])).toBe(0);
  });
});

describe("weekProgress", () => {
  const week = days({
    "2024-01-01": true,
    "2024-01-02": true,
    "2024-01-03": false,
    "2024-01-04": true,
  });

  it("counts only days that have already happened", () => {
    // Mid-week should read 2/3, not 2/7 — an unfinished week is not a failed one.
    expect(weekProgress(week, "2024-01-01", "2024-01-03")).toEqual({
      complete: 2,
      elapsed: 3,
    });
  });

  it("reports the full week once it has elapsed", () => {
    expect(weekProgress(week, "2024-01-01", "2024-01-07")).toEqual({
      complete: 3,
      elapsed: 7,
    });
  });

  it("never counts past the end of the week", () => {
    const { elapsed } = weekProgress(week, "2024-01-01", "2024-02-01");
    expect(elapsed).toBe(7);
  });

  it("reports 0/1 on the first day of a week with nothing logged", () => {
    expect(weekProgress([], "2024-01-01", "2024-01-01")).toEqual({
      complete: 0,
      elapsed: 1,
    });
  });
});
