"use server";

import { revalidatePath } from "next/cache";
import { uuidv7 } from "uuidv7";
import { createClient } from "@/lib/supabase/server";

export type ChainUpdate = {
  date: string;
  steps?: number;
  mobilityDone?: boolean;
  hourlyWalks?: number;
};

export type ChainResult =
  | { error: null }
  | { error: "invalid_date" | "invalid_steps" | "not_signed_in" | "save_failed" };

/**
 * Creates or updates the chain entry for one day.
 *
 * Upserts on the `(user_id, date)` unique constraint, so a retry after a dropped
 * connection updates the same row instead of failing or duplicating — the same
 * property the offline outbox will rely on in phase 5.
 *
 * `is_complete` is deliberately not written: it is a generated column, so the
 * database decides whether the chain held that day.
 */
export async function saveChainEntry(update: ChainUpdate): Promise<ChainResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(update.date)) {
    return { error: "invalid_date" };
  }

  // A mistyped step count would silently break or fake a streak, so the range is
  // checked rather than clamped.
  if (
    update.steps !== undefined &&
    (!Number.isInteger(update.steps) || update.steps < 0 || update.steps > 200_000)
  ) {
    return { error: "invalid_steps" };
  }

  if (
    update.hourlyWalks !== undefined &&
    (!Number.isInteger(update.hourlyWalks) ||
      update.hourlyWalks < 0 ||
      update.hourlyWalks > 24)
  ) {
    return { error: "invalid_steps" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_signed_in" };

  const { data: existing } = await supabase
    .from("daily_chain")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", update.date)
    .maybeSingle();

  const { error } = await supabase.from("daily_chain").upsert(
    {
      id: existing?.id ?? uuidv7(),
      user_id: user.id,
      date: update.date,
      ...(update.steps !== undefined ? { steps: update.steps } : {}),
      ...(update.mobilityDone !== undefined
        ? { mobility_done: update.mobilityDone }
        : {}),
      ...(update.hourlyWalks !== undefined
        ? { hourly_walks: update.hourlyWalks }
        : {}),
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { error: "save_failed" };

  revalidatePath("/", "layout");
  return { error: null };
}
