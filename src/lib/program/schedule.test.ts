import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  getDayType,
  getProgramDay,
  getProgramWeek,
  isoWeekday,
  PROGRAM_DAYS,
} from "./schedule";

// 2024-01-01 is a Monday, which makes the weekly cycle line up with the
// program document's Пн–Нд table.
const MONDAY_START = "2024-01-01";

describe("isoWeekday", () => {
  it("returns 1 for Monday and 7 for Sunday", () => {
    expect(isoWeekday("2024-01-01")).toBe(1);
    expect(isoWeekday("2024-01-07")).toBe(7);
  });
});

describe("getProgramDay", () => {
  it("counts the start date as day 1", () => {
    expect(getProgramDay(MONDAY_START, MONDAY_START)).toBe(1);
  });

  it("counts the last day as day 42", () => {
    expect(getProgramDay("2024-02-11", MONDAY_START)).toBe(PROGRAM_DAYS);
  });

  it("returns null before the start and after day 42", () => {
    expect(getProgramDay("2023-12-31", MONDAY_START)).toBeNull();
    expect(getProgramDay("2024-02-12", MONDAY_START)).toBeNull();
  });
});

describe("getProgramWeek", () => {
  it("puts days 1-7 in week 1 and days 8-14 in week 2", () => {
    expect(getProgramWeek("2024-01-01", MONDAY_START)).toBe(1);
    expect(getProgramWeek("2024-01-07", MONDAY_START)).toBe(1);
    expect(getProgramWeek("2024-01-08", MONDAY_START)).toBe(2);
  });

  it("puts the final day in week 6", () => {
    expect(getProgramWeek("2024-02-11", MONDAY_START)).toBe(6);
  });
});

describe("getDayType — weekly cycle", () => {
  it("matches the program table for week 1", () => {
    const week1 = [
      "2024-01-01", // Пн
      "2024-01-02", // Вт
      "2024-01-03", // Ср
      "2024-01-04", // Чт
      "2024-01-05", // Пт
      "2024-01-06", // Сб
      "2024-01-07", // Нд
    ].map((d) => getDayType(d, MONDAY_START));

    expect(week1).toEqual([
      "strength_a",
      "walk",
      "strength_b",
      "walk",
      "strength_a",
      "long_walk",
      "rest",
    ]);
  });

  it("flips the strength days in week 2 (Б/А/Б)", () => {
    const strengthDays = ["2024-01-08", "2024-01-10", "2024-01-12"].map((d) =>
      getDayType(d, MONDAY_START),
    );

    expect(strengthDays).toEqual(["strength_b", "strength_a", "strength_b"]);
  });

  it("returns to А/Б/А in week 3, continuing the cycle", () => {
    const strengthDays = ["2024-01-15", "2024-01-17", "2024-01-19"].map((d) =>
      getDayType(d, MONDAY_START),
    );

    expect(strengthDays).toEqual(["strength_a", "strength_b", "strength_a"]);
  });

  it("returns null outside the program window", () => {
    expect(getDayType("2023-12-31", MONDAY_START)).toBeNull();
    expect(getDayType("2024-02-12", MONDAY_START)).toBeNull();
  });
});

describe("getDayType — non-Monday start", () => {
  // Starting mid-week is allowed; the A/B alternation must stay continuous
  // rather than resetting or shifting with the calendar week.
  const WEDNESDAY_START = "2024-01-03";

  it("alternates from the first strength day regardless of weekday", () => {
    expect(getDayType("2024-01-03", WEDNESDAY_START)).toBe("strength_a");
    expect(getDayType("2024-01-05", WEDNESDAY_START)).toBe("strength_b");
    expect(getDayType("2024-01-08", WEDNESDAY_START)).toBe("strength_a");
    expect(getDayType("2024-01-10", WEDNESDAY_START)).toBe("strength_b");
  });

  it("still assigns walks, long walk and rest by weekday", () => {
    expect(getDayType("2024-01-04", WEDNESDAY_START)).toBe("walk");
    expect(getDayType("2024-01-06", WEDNESDAY_START)).toBe("long_walk");
    expect(getDayType("2024-01-07", WEDNESDAY_START)).toBe("rest");
  });
});

describe("buildSchedule", () => {
  const schedule = buildSchedule(MONDAY_START);

  it("covers exactly 42 consecutive days", () => {
    expect(schedule).toHaveLength(PROGRAM_DAYS);
    expect(schedule[0]).toMatchObject({ date: MONDAY_START, day: 1, week: 1 });
    expect(schedule.at(-1)).toMatchObject({
      date: "2024-02-11",
      day: 42,
      week: 6,
    });
  });

  it("schedules 18 strength sessions, split evenly between A and B", () => {
    const a = schedule.filter((d) => d.type === "strength_a").length;
    const b = schedule.filter((d) => d.type === "strength_b").length;

    expect(a + b).toBe(18); // 3 per week × 6 weeks
    expect(a).toBe(9);
    expect(b).toBe(9);
  });

  it("schedules one long walk and one rest day per week", () => {
    expect(schedule.filter((d) => d.type === "long_walk")).toHaveLength(6);
    expect(schedule.filter((d) => d.type === "rest")).toHaveLength(6);
  });
});
