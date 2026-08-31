"use server";

import { revalidatePath } from "next/cache";
import { uuidv7 } from "uuidv7";
import { createClient } from "@/lib/supabase/server";
import type { DayType } from "@/lib/program/schedule";

export type ActionError =
  | "not_signed_in"
  | "invalid_input"
  | "save_failed"
  | null;

/** Creates today's session row if it does not exist yet, and returns its id. */
export async function ensureSession(input: {
  userProgramId: string;
  date: string;
  dayType: DayType;
}): Promise<{ sessionId: string | null; error: ActionError }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { sessionId: null, error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sessionId: null, error: "not_signed_in" };

  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("user_program_id", input.userProgramId)
    .eq("scheduled_date", input.date)
    .maybeSingle();

  if (existing) return { sessionId: existing.id, error: null };

  const id = uuidv7();
  const { error } = await supabase.from("sessions").insert({
    id,
    user_id: user.id,
    user_program_id: input.userProgramId,
    scheduled_date: input.date,
    day_type: input.dayType,
    status: "planned",
    started_at: new Date().toISOString(),
  });

  if (error) return { sessionId: null, error: "save_failed" };

  revalidatePath("/", "layout");
  return { sessionId: id, error: null };
}

export type LogSetInput = {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  reps?: number | null;
  weightKg?: number | null;
  durationSec?: number | null;
  distanceM?: number | null;
  rpe?: "easy" | "ok" | "hard" | null;
  painFlag?: boolean;
};

/**
 * Records one set.
 *
 * The id is client-generated (UUIDv7) and the write is an upsert on
 * `(session_id, exercise_id, set_index)`, so a retry after a dropped connection
 * corrects the same set rather than creating a duplicate — the property the
 * offline outbox will depend on in phase 5.
 */
export async function logSet(input: LogSetInput): Promise<{ error: ActionError }> {
  if (!Number.isInteger(input.setIndex) || input.setIndex < 1) {
    return { error: "invalid_input" };
  }
  if (input.reps != null && (!Number.isInteger(input.reps) || input.reps < 0 || input.reps > 500)) {
    return { error: "invalid_input" };
  }
  if (input.weightKg != null && (input.weightKg < 0 || input.weightKg > 500)) {
    return { error: "invalid_input" };
  }
  if (input.durationSec != null && (input.durationSec < 0 || input.durationSec > 7200)) {
    return { error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_signed_in" };

  const { data: existing } = await supabase
    .from("set_logs")
    .select("id")
    .eq("session_id", input.sessionId)
    .eq("exercise_id", input.exerciseId)
    .eq("set_index", input.setIndex)
    .maybeSingle();

  const { error } = await supabase.from("set_logs").upsert(
    {
      id: existing?.id ?? uuidv7(),
      user_id: user.id,
      session_id: input.sessionId,
      exercise_id: input.exerciseId,
      set_index: input.setIndex,
      reps: input.reps ?? null,
      weight_kg: input.weightKg ?? null,
      duration_sec: input.durationSec ?? null,
      distance_m: input.distanceM ?? null,
      rpe: input.rpe ?? null,
      pain_flag: input.painFlag ?? false,
    },
    { onConflict: "session_id,exercise_id,set_index" },
  );

  if (error) return { error: "save_failed" };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function finishSession(sessionId: string): Promise<{ error: ActionError }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_signed_in" };

  const { error } = await supabase
    .from("sessions")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: "save_failed" };

  revalidatePath("/", "layout");
  return { error: null };
}
