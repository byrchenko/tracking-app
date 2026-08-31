"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = {
  uk: "Укр",
  en: "Eng",
};

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border p-1"
      role="group"
      aria-label={t("language")}
    >
      {routing.locales.map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-current={candidate === locale ? "true" : undefined}
          onClick={() => router.replace(pathname, { locale: candidate })}
          className={
            candidate === locale
              ? "rounded-full bg-accent px-3 py-1 text-sm text-accent-fg"
              : "rounded-full px-3 py-1 text-sm text-muted"
          }
        >
          {LABELS[candidate]}
        </button>
      ))}
    </div>
  );
}
