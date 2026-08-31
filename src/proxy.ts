import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`. next-intl still
 * ships its handler as `createMiddleware`; only the file and export names moved.
 */
export const proxy = createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
