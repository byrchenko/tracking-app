import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SignInForm } from "@/features/auth/sign-in-form";
import { SignInError } from "@/features/auth/sign-in-error";
import { routing } from "@/i18n/routing";

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted">{t("subtitle")}</p>
      <SignInError initialError={typeof error === "string" ? error : undefined} />
      <SignInForm />
    </main>
  );
}
