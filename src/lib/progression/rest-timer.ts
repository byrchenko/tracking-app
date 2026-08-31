/**
 * Rest timer maths.
 *
 * "Відпочинок між підходами 90 сек."
 *
 * A 90-second countdown cannot be trusted to a JavaScript interval: a
 * backgrounded or locked phone throttles timers, and the count drifts or stops.
 * So nothing counts down — a deadline timestamp is stored, and the remaining
 * time is derived from the wall clock every time the UI renders or the tab
 * wakes. That stays correct across a screen lock, which is the normal case when
 * someone puts the phone down between sets.
 */

export const DEFAULT_REST_SECONDS = 90;

/** Seconds left until `deadline`, never negative. */
export function remainingSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function isElapsed(deadline: number, now: number): boolean {
  return now >= deadline;
}

export function restDeadline(
  startedAt: number,
  seconds: number = DEFAULT_REST_SECONDS,
): number {
  return startedAt + seconds * 1000;
}

/** `m:ss`, for display. */
export function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
