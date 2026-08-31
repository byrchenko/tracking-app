import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChainDay } from "@/lib/program/streak";
import type { DateString } from "@/lib/program/schedule";

export type ChainEntry = {
  id: string;
  date: DateString;
  steps: number;
  mobilityDone: boolean;
  hourlyWalks: number;
  isComplete: boolean;
};

/** Every chain entry for the current user, oldest first. */
export async function getChainEntries(): Promise<ChainEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("daily_chain")
    .select("id, date, steps, mobility_done, hourly_walks, is_complete")
    .eq("user_id", user.id)
    .order("date");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    date: row.date,
    steps: row.steps,
    mobilityDone: row.mobility_done,
    hourlyWalks: row.hourly_walks,
    // is_complete is a generated column, so the database is authoritative.
    isComplete: row.is_complete ?? false,
  }));
}

export function toChainDays(entries: ChainEntry[]): ChainDay[] {
  return entries.map((e) => ({ date: e.date, isComplete: e.isComplete }));
}

export function findEntry(
  entries: ChainEntry[],
  date: DateString,
): ChainEntry | null {
  return entries.find((e) => e.date === date) ?? null;
}
