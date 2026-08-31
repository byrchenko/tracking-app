import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getBenchmarks } from "@/features/benchmarks/queries";
import { BenchmarkTable } from "@/features/benchmarks/benchmark-table";
import { getActiveProgram, getCurrentUser } from "@/features/program/queries";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getProgramDay, PROGRAM_DAYS, toDateString } from "@/lib/program/schedule";

export default async function BenchmarksPage({
  params,
}: PageProps<"/[locale]/benchmarks">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Link href="/sign-in" className="text-accent underline">{t("auth.title")}</Link>
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

  const rows = await getBenchmarks(program.id);
  const day = getProgramDay(toDateString(new Date()), program.startDate);

  // The entry норматив is taken before day 1; the same tests are repeated on
  // day 42. The end column only opens in the final week (or once the program is
  // over) — offering it at the halfway point invites recording a "week 6" result
  // that is nothing of the sort. Until then the start column stays editable so a
  // mistyped entry number can still be corrected.
  const startComplete = rows.every((r) => r.start !== null);
  const inFinalWeek = day === null || day >= PROGRAM_DAYS - 6;
  const editablePhase = startComplete && inFinalWeek ? "end" : "start";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {t("benchmarks.title")}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {editablePhase === "start"
          ? t("benchmarks.enterStart")
          : t("benchmarks.enterEnd")}
      </p>

      <BenchmarkTable
        userProgramId={program.id}
        rows={rows}
        editablePhase={editablePhase}
      />
    </main>
  );
}
