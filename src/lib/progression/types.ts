/**
 * Declarative progression rules, stored on `program_exercises.progression` and
 * interpreted here. Transcribed from ПРАВИЛА ПРОГРЕСІЇ in the program document.
 */

export type Progression =
  | FixedProgression
  | RepsThenWeightProgression
  | TimeThenUnlockProgression;

/** Carries, core work and walks — the program prescribes no automatic increase. */
export type FixedProgression = {
  type: "fixed";
  note?: string;
};

/**
 * Rule 1: "+2 повторення щотижня до кожної вправи. Дійшов до 15 — переходь на
 * наступну вагу і повертайся до стартових повторень."
 */
export type RepsThenWeightProgression = {
  type: "reps_then_weight";
  repIncrement: number;
  cadence: "week";
  repCap: number;
  weightLadderKg: number[];
  /**
   * Rule 2: "махи 16 кг → коли 5×15 стає легко, бери 20 кг."
   *
   * When set, the weight does NOT advance on the calendar. It advances only
   * once the athlete has logged the capped set as easy — and even then the
   * engine only *suggests* it. See `readyToStepUp` in `Target`.
   */
  stepUpWhen?: "rpe_easy";
};

/** Rules 3 and 4: holds that eventually unlock a harder movement. */
export type TimeThenUnlockProgression = {
  type: "time_then_unlock";
  cadence: "week";
  capSeconds: number;
  secondsIncrement?: number;
  /** "3× макс" — held to failure rather than to a prescribed time. */
  maxEffort?: boolean;
  unlock: {
    replaceWith: string;
    /** Additional conditions on *other* exercises (rule 3). */
    requires?: Array<{ exercise: string; sets: number; reps: number }>;
  };
};

/** A single logged set, reduced to what the engine needs. */
export type SetRecord = {
  exerciseSlug: string;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  rpe: "easy" | "ok" | "hard" | null;
};

export type Prescription = {
  exerciseSlug: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  seconds: number | null;
  distanceM: number | null;
  perSide: boolean;
  progression: Progression;
};

export type Target = {
  exerciseSlug: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  seconds: number | null;
  distanceM: number | null;
  perSide: boolean;
  /**
   * Set when the athlete has met the condition to take the next weight.
   *
   * Deliberately a suggestion rather than an applied change: the program says
   * "коли 5×15 стає легко, **бери** 20 кг" — the athlete takes it. Silently
   * putting more weight on the bar because a rule fired is not something an app
   * should do on someone's behalf.
   */
  readyToStepUp: { toWeightKg: number } | null;
  /**
   * Set when a harder variant has been earned (rules 3 and 4). Also a
   * suggestion — "починаєш негативні підтягування", you start them.
   */
  unlockAvailable: { exerciseSlug: string } | null;
  note?: string;
};
