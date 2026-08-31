import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { toDateString, type DateString } from "./schedule";

export type ChainDay = {
  date: DateString;
  isComplete: boolean;
};

/**
 * The ланцюг: 7000 steps plus the mobility work, every day without exception.
 *
 * The program's framing — "перемагає не той, хто зробив найважче тренування, а
 * той, хто не розірвав ланцюг за 42 дні" — makes this the number the app is
 * really about, so it gets the same test treatment as the progression engine.
 */

/**
 * Length of the streak running up to `today`.
 *
 * An incomplete *today* does not break the streak: the day is not over yet, and
 * showing "0" at 9am because the steps aren't in would be both wrong and
 * demoralising. Counting therefore starts at today when today is done, and at
 * yesterday otherwise. An incomplete *yesterday* does break it.
 */
export function currentStreak(days: ChainDay[], today: DateString): number {
  const complete = new Set(
    days.filter((d) => d.isComplete).map((d) => d.date),
  );

  let cursor = complete.has(today)
    ? today
    : toDateString(addDays(parseISO(today), -1));

  let streak = 0;
  while (complete.has(cursor)) {
    streak++;
    cursor = toDateString(addDays(parseISO(cursor), -1));
  }
  return streak;
}

/** The longest run of consecutive complete days anywhere in the history. */
export function longestStreak(days: ChainDay[]): number {
  const complete = days
    .filter((d) => d.isComplete)
    .map((d) => d.date)
    .sort();

  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const date of complete) {
    const consecutive =
      previous !== null &&
      differenceInCalendarDays(parseISO(date), parseISO(previous)) === 1;

    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

/**
 * Complete days within a program week, for the document's "Ланцюг: 7/7" mark.
 *
 * Days in the future are excluded from the denominator: a week in progress
 * should read "3/3", not "3/7", so an unfinished week never looks like failure.
 */
export function weekProgress(
  days: ChainDay[],
  weekStart: DateString,
  today: DateString,
): { complete: number; elapsed: number } {
  const byDate = new Map(days.map((d) => [d.date, d.isComplete]));
  const start = parseISO(weekStart);

  let complete = 0;
  let elapsed = 0;

  for (let i = 0; i < 7; i++) {
    const date = toDateString(addDays(start, i));
    if (differenceInCalendarDays(parseISO(date), parseISO(today)) > 0) break;
    elapsed++;
    if (byDate.get(date)) complete++;
  }

  return { complete, elapsed };
}

/** Whether a day's raw counters satisfy the program's daily requirement. */
export function isChainComplete(entry: {
  steps: number;
  mobilityDone: boolean;
}): boolean {
  return entry.steps >= CHAIN_STEP_TARGET && entry.mobilityDone;
}

/**
 * "7000 кроків" from the program. Mirrors the generated `daily_chain.is_complete`
 * column — the database is authoritative, this is for optimistic UI before a
 * write lands.
 */
export const CHAIN_STEP_TARGET = 7000;
