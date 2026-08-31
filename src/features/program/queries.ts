import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateString } from "@/lib/program/schedule";

export type ActiveProgram = {
  id: string;
  startDate: DateString;
  timezone: string;
  programSlug: string;
};

/**
 * The signed-in user's active 42-day run, or null if they have not started one.
 *
 * RLS scopes this to the current user, so no explicit user_id filter is needed —
 * but one is included anyway. Defence in depth costs nothing here, and it makes
 * the intent obvious to anyone reading the query.
 */
export async function getActiveProgram(): Promise<ActiveProgram | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_programs")
    .select("id, start_date, timezone, programs(slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    startDate: data.start_date,
    timezone: data.timezone,
    programSlug: data.programs?.slug ?? "operation-base",
  };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
