import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

export default async function TodayPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("app.title")}
          </h1>
          <p className="text-sm text-muted">{t("app.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-medium">{t("chain.title")}</h2>
        <p className="text-sm text-muted">{t("chain.description")}</p>
      </section>

      <p className="mt-8 border-l-2 border-accent pl-4 text-sm text-muted italic">
        {t("app.rule")}
      </p>
    </main>
  );
}
