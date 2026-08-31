import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

/** A calendar date with no time component, as `yyyy-MM-dd`. */
export type DateString = string;

export type DayType =
  | "strength_a"
  | "strength_b"
  | "walk"
  | "long_walk"
  | "rest";

export const PROGRAM_DAYS = 42;
export const PROGRAM_WEEKS = 6;

/**
 * The weekly cycle from the program document, indexed by ISO weekday
 * (1 = Monday … 7 = Sunday):
 *
 *   Пн        Вт          Ср        Чт          Пт        Сб            Нд
 *   Сила А    Ходьба      Сила Б    Ходьба      Сила А/Б  Довгий вихід  Відпочинок
 *
 * Monday/Wednesday/Friday are strength slots; which of A or B they resolve to
 * depends on position in the alternating sequence, not on the weekday.
 */
const STRENGTH_WEEKDAYS = [1, 3, 5] as const;

function isStrengthWeekday(isoWeekday: number): boolean {
  return (STRENGTH_WEEKDAYS as readonly number[]).includes(isoWeekday);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: DateString): number {
  const day = parseISO(date).getDay();
  return day === 0 ? 7 : day;
}

export function toDateString(date: Date): DateString {
  return format(date, "yyyy-MM-dd");
}

/**
 * 1-based day number within the program, or `null` when the date falls outside
 * the 42-day window.
 */
export function getProgramDay(
  date: DateString,
  startDate: DateString,
): number | null {
  const offset = differenceInCalendarDays(parseISO(date), parseISO(startDate));
  if (offset < 0 || offset >= PROGRAM_DAYS) return null;
  return offset + 1;
}

/** 1-based week number (1–6), or `null` outside the program window. */
export function getProgramWeek(
  date: DateString,
  startDate: DateString,
): number | null {
  const day = getProgramDay(date, startDate);
  if (day === null) return null;
  return Math.floor((day - 1) / 7) + 1;
}

/**
 * How many strength sessions are scheduled strictly before `date`, counting
 * from the program start. Drives the A/B alternation.
 *
 * The program specifies week 1 = A/B/A, week 2 = B/A/B, "і далі по колу" —
 * which is one continuous A,B,A,B,… sequence across every strength slot rather
 * than a per-week pattern. Counting slots instead of deriving from the week
 * number keeps that alternation correct even when the program does not start on
 * a Monday.
 */
function strengthSlotIndex(date: DateString, startDate: DateString): number {
  const offset = differenceInCalendarDays(parseISO(date), parseISO(startDate));
  let count = 0;
  for (let i = 0; i < offset; i++) {
    const day = toDateString(addDays(parseISO(startDate), i));
    if (isStrengthWeekday(isoWeekday(day))) count++;
  }
  return count;
}

/**
 * Which kind of day this date is within the program, or `null` outside the
 * 42-day window.
 */
export function getDayType(
  date: DateString,
  startDate: DateString,
): DayType | null {
  if (getProgramDay(date, startDate) === null) return null;

  const weekday = isoWeekday(date);

  if (isStrengthWeekday(weekday)) {
    return strengthSlotIndex(date, startDate) % 2 === 0
      ? "strength_a"
      : "strength_b";
  }
  if (weekday === 6) return "long_walk";
  if (weekday === 7) return "rest";
  return "walk";
}

/** Every date in the 42-day program, in order, with its day type. */
export function buildSchedule(
  startDate: DateString,
): Array<{ date: DateString; day: number; week: number; type: DayType }> {
  const start = parseISO(startDate);
  return Array.from({ length: PROGRAM_DAYS }, (_, i) => {
    const date = toDateString(addDays(start, i));
    return {
      date,
      day: i + 1,
      week: Math.floor(i / 7) + 1,
      // Inside the window every date resolves, so the null branch is unreachable.
      type: getDayType(date, startDate) as DayType,
    };
  });
}
