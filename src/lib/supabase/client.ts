"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Supabase client for browser code.
 *
 * `createBrowserClient` is a singleton by default, so calling this repeatedly
 * from components is cheap and returns the same instance.
 */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
