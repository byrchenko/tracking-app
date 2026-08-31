import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";
import { hasSupabaseEnv, supabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth session and writes any rotated cookies onto
 * `response`.
 *
 * Server Components cannot set cookies, so this is the one place a refreshed
 * token actually gets persisted. Without it, sessions expire mid-use and
 * produce random logouts that are miserable to debug.
 *
 * The response is *mutated* rather than replaced: it already carries whatever
 * next-intl decided (including a locale redirect), and building a fresh
 * response here would discard that.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  // Lets the app boot and serve pages before Supabase is configured.
  if (!hasSupabaseEnv()) return response;

  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must run immediately after client creation with nothing in between:
  // this call is what triggers the refresh and the setAll above.
  // getUser() revalidates the token with the auth server rather than trusting
  // whatever the cookie claims, which is the point of doing it in the proxy.
  await supabase.auth.getUser();

  return response;
}
