import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ChainChecklist } from "@/features/chain/chain-checklist";
import { findEntry, getChainEntries, toChainDays } from "@/features/chain/queries";
import { getActiveProgram, getCurrentUser } from "@/features/program/queries";
import { SessionCard } from "@/features/program/session-card";
import { StartProgramForm } from "@/features/program/start-program-form";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  getDayType,
  getProgramDay,
  getProgramWeek,
  PROGRAM_DAYS,
  toDateString,
} from "@/lib/program/schedule";
import { currentStreak } from "@/lib/program/streak";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function TodayPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const user = await getCurrentUser();

  const header = (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("app.title")}</h1>
        <p className="text-sm text-muted">{t("app.subtitle")}</p>
      </div>
      <LocaleSwitcher />
    </header>
  );

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {header}
        <p className="mb-6 border-l-2 border-accent pl-4 text-sm text-muted italic">
          {t("app.rule")}
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-accent px-4 py-2 text-base font-medium text-accent-fg"
        >
          {t("auth.title")}
        </Link>
      </main>
    );
  }

  const program = await getActiveProgram();

  if (!program) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {header}
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-4 text-sm font-medium">{t("program.notStarted")}</h2>
          <StartProgramForm />
        </section>
      </main>
    );
  }

  // "Today" is the user's calendar day. Timezone is stored per enrolment so this
  // stays unambiguous while travelling.
  const today = toDateString(new Date());
  const entries = await getChainEntries();
  const todayEntry = findEntry(entries, today);

  const day = getProgramDay(today, program.startDate);
  const week = getProgramWeek(today, program.startDate);
  const dayType = getDayType(today, program.startDate);
  const streak = currentStreak(toChainDays(entries), today);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      {header}

      <div className="mb-4 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">
          {day === null
            ? t("program.finished")
            : t("program.dayOf", { day, total: PROGRAM_DAYS })}
        </span>
        <span className="font-medium text-accent tabular-nums">
          {t("chain.streak", { days: streak })}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <ChainChecklist
          date={today}
          initial={{
            steps: todayEntry?.steps ?? 0,
            mobilityDone: todayEntry?.mobilityDone ?? false,
            hourlyWalks: todayEntry?.hourlyWalks ?? 0,
          }}
        />

        {dayType && week ? (
          <SessionCard dayType={dayType} week={week} locale={locale} />
        ) : null}
      </div>

      <p className="mt-8 border-l-2 border-accent pl-4 text-sm text-muted italic">
        {t("app.rule")}
      </p>
    </main>
  );
}
