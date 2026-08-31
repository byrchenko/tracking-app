import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getChainEntries, toChainDays } from "@/features/chain/queries";
import { getBodyMetrics } from "@/features/metrics/queries";
import { MetricForm } from "@/features/metrics/metric-form";
import { getActiveProgram, getCurrentUser } from "@/features/program/queries";
import { ChainWeeksChart } from "@/features/progress/chain-weeks-chart";
import { TrendChart } from "@/features/progress/trend-chart";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { addDays, parseISO } from "date-fns";
import { PROGRAM_WEEKS, toDateString } from "@/lib/program/schedule";
import { weekProgress } from "@/lib/program/streak";

export default async function ProgressPage({ params }: PageProps<"/[locale]/progress">) {
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
  const [entries, metrics] = await Promise.all([getChainEntries(), getBodyMetrics()]);
  const today = toDateString(new Date());
  const todayMetric = metrics.find((m) => m.date === today);

  const weeks = program
    ? Array.from({ length: PROGRAM_WEEKS }, (_, i) => {
        const weekStart = toDateString(addDays(parseISO(program.startDate), i * 7));
        const { complete, elapsed } = weekProgress(
          toChainDays(entries),
          weekStart,
          today,
        );
        return { week: i + 1, complete, elapsed };
      }).filter((w) => w.elapsed > 0)
    : [];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("nav.progress")}</h1>

      <div className="flex flex-col gap-4">
        <MetricForm
          date={today}
          initial={{
            weightKg: todayMetric?.weightKg ?? null,
            waistCm: todayMetric?.waistCm ?? null,
          }}
        />

        {weeks.length > 0 ? <ChainWeeksChart data={weeks} /> : null}

        {/* Weight and waist get separate charts on purpose: two y-scales on one
            plot would invent a correlation that isn't in the data. */}
        <TrendChart
          title={t("progress.weight")}
          unit={t("units.kg")}
          data={metrics.map((m) => ({ date: m.date, value: m.weightKg }))}
        />
        <TrendChart
          title={t("progress.waist")}
          unit={t("units.cm")}
          data={metrics.map((m) => ({ date: m.date, value: m.waistCm }))}
        />
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/benchmarks" className="text-accent underline">
          {t("nav.benchmarks")}
        </Link>
      </p>
    </main>
  );
}
