import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/proxy";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`. next-intl still
 * ships its handler as `createMiddleware`; only the file and export names moved.
 */
const handleI18n = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Locale negotiation runs first — it may produce a redirect, and the auth
  // cookies still need to ride on whatever response comes out of it.
  const response = handleI18n(request);
  return refreshSession(request, response);
}

export const config = {
  // Everything except API routes, Next internals, and files with an extension.
  matcher: "/((?!api|auth|_next|_vercel|.*\\..*).*)",
};
