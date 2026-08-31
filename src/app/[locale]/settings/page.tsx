import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/program/queries";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations();
  const user = await getCurrentUser();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("nav.settings")}</h1>

      <div className="flex flex-col gap-4">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium">{t("common.language")}</h2>
          <LocaleSwitcher />
        </section>

        {user ? (
          <>
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-1 text-sm font-medium">{t("settings.export")}</h2>
              <p className="mb-3 text-xs text-muted">{t("settings.exportHint")}</p>
              {/* A plain link, so the browser handles the download and the file
                  never passes through client-side memory. */}
              <a
                href="/api/export"
                download
                className="inline-block rounded-lg border border-border px-4 py-2 text-sm"
              >
                {t("settings.downloadJson")}
              </a>
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-3 text-xs text-muted">{user.email}</p>
              <form action={signOut.bind(null, locale)}>
                <button
                  type="submit"
                  className="rounded-lg border border-border px-4 py-2 text-sm"
                >
                  {t("auth.signOut")}
                </button>
              </form>
            </section>
          </>
        ) : (
          <Link href="/sign-in" className="text-accent underline">
            {t("auth.title")}
          </Link>
        )}

        <p className="text-center text-sm">
          <Link href="/benchmarks" className="text-accent underline">
            {t("nav.benchmarks")}
          </Link>
        </p>
      </div>
    </main>
  );
}
