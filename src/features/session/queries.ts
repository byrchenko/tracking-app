import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateString, DayType } from "@/lib/program/schedule";
import type { Prescription, Progression, SetRecord } from "@/lib/progression/types";
import { computeTarget } from "@/lib/progression/engine";
import type { Target } from "@/lib/progression/types";

export type LocalisedName = { uk?: string; en?: string };

export type SessionExercise = {
  exerciseId: string;
  slug: string;
  name: LocalisedName;
  cues: LocalisedName | null;
  metricType: "reps" | "reps_weight" | "time" | "distance_weight";
  target: Target;
  loggedSets: Array<{
    id: string;
    setIndex: number;
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
    distanceM: number | null;
    rpe: "easy" | "ok" | "hard" | null;
    painFlag: boolean;
  }>;
};

export type SessionView = {
  sessionId: string | null;
  status: "planned" | "done" | "skipped";
  dayType: DayType;
  week: number;
  exercises: SessionExercise[];
};

/**
 * Everything the session runner needs for one day, with targets already
 * computed.
 *
 * Targets are derived here rather than read from `progression_state` — the
 * engine recomputes from history, so a rule fix corrects existing users with no
 * data migration.
 */
export async function getSessionView(
  userProgramId: string,
  date: DateString,
  dayType: DayType,
  week: number,
): Promise<SessionView | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: prescriptions }, { data: session }, { data: history }] =
    await Promise.all([
      supabase
        .from("program_exercises")
        .select(
          "order_index, target_sets, target_reps, target_weight_kg, target_seconds, target_distance_m, per_side, active_from_week, active_to_week, progression, exercise_id, exercises(slug, name, cues, metric_type), program_days!inner(day_type)",
        )
        .eq("program_days.day_type", dayType)
        .order("order_index"),
      supabase
        .from("sessions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("user_program_id", userProgramId)
        .eq("scheduled_date", date)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("set_logs")
        .select("id, set_index, reps, weight_kg, duration_sec, distance_m, rpe, pain_flag, session_id, exercises(slug)")
        .eq("user_id", user.id)
        .is("deleted_at", null),
    ]);

  const allSets: SetRecord[] = (history ?? []).map((s) => ({
    exerciseSlug: s.exercises?.slug ?? "",
    reps: s.reps,
    weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
    durationSec: s.duration_sec,
    rpe: (s.rpe ?? null) as SetRecord["rpe"],
  }));

  const active = (prescriptions ?? []).filter(
    (row) =>
      row.active_from_week <= week &&
      (row.active_to_week === null || row.active_to_week >= week),
  );

  const exercises: SessionExercise[] = active.map((row) => {
    const slug = row.exercises?.slug ?? "";
    const prescription: Prescription = {
      exerciseSlug: slug,
      sets: row.target_sets ?? 1,
      reps: row.target_reps,
      weightKg: row.target_weight_kg === null ? null : Number(row.target_weight_kg),
      seconds: row.target_seconds,
      distanceM: row.target_distance_m === null ? null : Number(row.target_distance_m),
      perSide: row.per_side,
      progression: (row.progression ?? { type: "fixed" }) as unknown as Progression,
    };

    return {
      exerciseId: row.exercise_id,
      slug,
      name: (row.exercises?.name ?? {}) as LocalisedName,
      cues: (row.exercises?.cues ?? null) as LocalisedName | null,
      metricType: row.exercises?.metric_type ?? "reps",
      target: computeTarget({ prescription, week, history: allSets }),
      loggedSets: (history ?? [])
        .filter((s) => s.session_id === session?.id && s.exercises?.slug === slug)
        .map((s) => ({
          id: s.id,
          setIndex: s.set_index,
          reps: s.reps,
          weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
          durationSec: s.duration_sec,
          distanceM: s.distance_m === null ? null : Number(s.distance_m),
          rpe: (s.rpe ?? null) as SessionExercise["loggedSets"][number]["rpe"],
          painFlag: s.pain_flag,
        }))
        .sort((a, b) => a.setIndex - b.setIndex),
    };
  });

  return {
    sessionId: session?.id ?? null,
    status: (session?.status ?? "planned") as SessionView["status"],
    dayType,
    week,
    exercises,
  };
}
