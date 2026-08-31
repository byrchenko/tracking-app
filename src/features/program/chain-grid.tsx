import { getTranslations } from "next-intl/server";
import {
  buildSchedule,
  getProgramDay,
  toDateString,
  type DateString,
  type DayType,
} from "@/lib/program/schedule";
import { cn } from "@/lib/utils";

/**
 * Colour carries the *kind* of day, but never carries it alone — each cell also
 * shows its day number and an accessible label, so the grid is still readable
 * without colour perception.
 */
const DAY_STYLES: Record<DayType, string> = {
  strength_a: "bg-accent/85 text-accent-fg",
  strength_b: "bg-accent/55 text-accent-fg",
  walk: "bg-border text-foreground",
  long_walk: "bg-border text-foreground ring-1 ring-accent/60 ring-inset",
  rest: "bg-transparent text-muted border border-dashed border-border",
};

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export async function ChainGrid({
  startDate,
  today = toDateString(new Date()),
}: {
  startDate: DateString;
  today?: DateString;
}) {
  const t = await getTranslations();
  const schedule = buildSchedule(startDate);
  const currentDay = getProgramDay(today, startDate);

  const weeks = Array.from({ length: 6 }, (_, w) =>
    schedule.slice(w * 7, w * 7 + 7),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[2rem_repeat(7,1fr)] gap-1 text-center text-[0.65rem] text-muted">
        <span aria-hidden />
        {WEEKDAY_KEYS.map((key) => (
          <span key={key}>{t(`weekdays.${key}`)}</span>
        ))}
      </div>

      {weeks.map((week, i) => (
        <div
          key={i}
          className="grid grid-cols-[2rem_repeat(7,1fr)] items-center gap-1"
        >
          <span className="text-[0.65rem] text-muted">{i + 1}</span>

          {week.map((day) => {
            const isToday = day.day === currentDay;
            return (
              <div
                key={day.date}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${t("program.dayOf", { day: day.day, total: 42 })} — ${t(`days.${day.type}`)}`}
                title={`${day.date} — ${t(`days.${day.type}`)}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md text-xs font-medium tabular-nums",
                  DAY_STYLES[day.type],
                  isToday && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                )}
              >
                {day.day}
              </div>
            );
          })}
        </div>
      ))}

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-muted">
        {(Object.keys(DAY_STYLES) as DayType[]).map((type) => (
          <li key={type} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-3 rounded-sm", DAY_STYLES[type])}
            />
            {t(`days.${type}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
