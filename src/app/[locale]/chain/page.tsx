import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ChainGrid } from "@/features/program/chain-grid";
import { StartProgramForm } from "@/features/program/start-program-form";
import { getActiveProgram, getCurrentUser } from "@/features/program/queries";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function ChainPage({ params }: PageProps<"/[locale]/chain">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const user = await getCurrentUser();
  const program = user ? await getActiveProgram() : null;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {t("nav.chain")}
      </h1>
      <p className="mb-6 text-sm text-muted">{t("app.rule")}</p>

      {!user ? (
        <p className="text-sm">
          <Link href="/sign-in" className="text-accent underline">
            {t("auth.title")}
          </Link>
        </p>
      ) : program ? (
        <ChainGrid startDate={program.startDate} />
      ) : (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-1 text-sm font-medium">{t("program.notStarted")}</h2>
          <div className="mt-4">
            <StartProgramForm />
          </div>
        </section>
      )}
    </main>
  );
}
