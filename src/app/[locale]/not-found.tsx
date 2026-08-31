import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="mb-2 text-xl font-semibold">{t("notFound")}</h1>
      <Link href="/" className="text-accent underline">
        {t("backHome")}
      </Link>
    </main>
  );
}
