import { describe, expect, it } from "vitest";
import {
  DEFAULT_REST_SECONDS,
  formatRemaining,
  isElapsed,
  remainingSeconds,
  restDeadline,
} from "./rest-timer";

const T0 = 1_700_000_000_000;

describe("rest timer", () => {
  it("defaults to the program's 90 seconds", () => {
    expect(DEFAULT_REST_SECONDS).toBe(90);
    expect(restDeadline(T0)).toBe(T0 + 90_000);
  });

  it("derives the remaining time from the wall clock", () => {
    const deadline = restDeadline(T0);
    expect(remainingSeconds(deadline, T0)).toBe(90);
    expect(remainingSeconds(deadline, T0 + 30_000)).toBe(60);
    expect(remainingSeconds(deadline, T0 + 89_500)).toBe(1);
  });

  it("stays correct across a gap, as when the phone was locked", () => {
    // The whole point of deadline-based timing: no ticks happened for two
    // minutes, and the answer is still right on wake.
    const deadline = restDeadline(T0);
    expect(remainingSeconds(deadline, T0 + 120_000)).toBe(0);
    expect(isElapsed(deadline, T0 + 120_000)).toBe(true);
  });

  it("never reports negative time", () => {
    expect(remainingSeconds(restDeadline(T0), T0 + 999_999)).toBe(0);
  });

  it("treats the exact deadline as elapsed", () => {
    const deadline = restDeadline(T0);
    expect(isElapsed(deadline, deadline)).toBe(true);
    expect(isElapsed(deadline, deadline - 1)).toBe(false);
  });

  it("formats as m:ss", () => {
    expect(formatRemaining(90)).toBe("1:30");
    expect(formatRemaining(60)).toBe("1:00");
    expect(formatRemaining(9)).toBe("0:09");
    expect(formatRemaining(0)).toBe("0:00");
  });
});
