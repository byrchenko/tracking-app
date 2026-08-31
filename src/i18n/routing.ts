import { defineRouting } from "next-intl/routing";

/**
 * Ukrainian is the default because the program document
 * (docs/program/operation-6-weeks.md) is written in Ukrainian — keeping the app
 * in the same language as the source avoids drift between the two.
 */
export const routing = defineRouting({
  locales: ["uk", "en"],
  defaultLocale: "uk",
});

export type Locale = (typeof routing.locales)[number];
