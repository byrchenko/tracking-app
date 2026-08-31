import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getActiveProgram, getCurrentUser } from "@/features/program/queries";
import { getSessionView } from "@/features/session/queries";
import { SessionRunner } from "@/features/session/session-runner";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  getDayType,
  getProgramDay,
  getProgramWeek,
  PROGRAM_DAYS,
  toDateString,
} from "@/lib/program/schedule";

export default async function SessionPage({ params }: PageProps<"/[locale]/session">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Link href="/sign-in" className="text-accent underline">
          {t("auth.title")}
        </Link>
      </main>
    );
  }

  const program = await getActiveProgram();
  if (!program) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <p className="text-sm text-muted">{t("program.notStarted")}</p>
      </main>
    );
  }

  const date = toDateString(new Date());
  const dayType = getDayType(date, program.startDate);
  const week = getProgramWeek(date, program.startDate);
  const day = getProgramDay(date, program.startDate);

  if (!dayType || !week) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <p className="text-sm text-muted">{t("program.finished")}</p>
      </main>
    );
  }

  const view = await getSessionView(program.id, date, dayType, week);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(`days.${dayType}`)}
        </h1>
        <p className="text-sm text-muted">
          {t("program.dayOf", { day: day ?? 0, total: PROGRAM_DAYS })}
        </p>
      </header>

      {view ? (
        <SessionRunner view={view} userProgramId={program.id} date={date} />
      ) : null}
    </main>
  );
}
