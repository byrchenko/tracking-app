import type {
  Prescription,
  RepsThenWeightProgression,
  SetRecord,
  Target,
  TimeThenUnlockProgression,
} from "./types";

/**
 * Computes what to do today for one prescribed exercise.
 *
 * Pure and dependency-free: everything it needs arrives as arguments, so the
 * whole thing is exhaustively testable. This is where a bug is most expensive —
 * a wrong answer means a wrong weight on the bar — which is why it is separated
 * from every concern that touches React, the network or IndexedDB.
 *
 * It is also the reason `progression_state` in the database is a cache and not
 * the authority: this recomputes from history, so fixing a rule corrects
 * existing users without a data migration.
 */
export function computeTarget(input: {
  prescription: Prescription;
  /** 1-based week within the 42 days. */
  week: number;
  /** Every set the athlete has logged, for any exercise. */
  history: SetRecord[];
}): Target {
  const { prescription, week, history } = input;
  const base: Target = {
    exerciseSlug: prescription.exerciseSlug,
    sets: prescription.sets,
    reps: prescription.reps,
    weightKg: prescription.weightKg,
    seconds: prescription.seconds,
    distanceM: prescription.distanceM,
    perSide: prescription.perSide,
    readyToStepUp: null,
    unlockAvailable: null,
  };

  switch (prescription.progression.type) {
    case "fixed":
      return { ...base, note: prescription.progression.note };
    case "reps_then_weight":
      return repsThenWeight(base, prescription, prescription.progression, week, history);
    case "time_then_unlock":
      return timeThenUnlock(base, prescription, prescription.progression, week, history);
  }
}

/**
 * Rule 1, and rule 2 for the kettlebell swing.
 *
 * Progression is driven by the calendar, not by attendance: the program says
 * "пропустив день — ідеш далі за планом. Ніяких подвійних обсягів для
 * надолуження." A missed week does not hold the schedule back.
 */
function repsThenWeight(
  base: Target,
  prescription: Prescription,
  rule: RepsThenWeightProgression,
  week: number,
  history: SetRecord[],
): Target {
  const startReps = prescription.reps ?? 0;
  const ladder = rule.weightLadderKg;
  const weeksElapsed = Math.max(0, week - 1);

  // Bodyweight work has no ladder to climb, so it rises to the cap and holds
  // there. That is what makes australian rows reach 3×15 — the second half of
  // rule 3's unlock condition.
  if (ladder.length === 0) {
    return {
      ...base,
      reps: Math.min(startReps + rule.repIncrement * weeksElapsed, rule.repCap),
      weightKg: null,
    };
  }

  // Rule 2: the weight waits for the athlete's own verdict, not the calendar.
  if (rule.stepUpWhen === "rpe_easy") {
    const reps = Math.min(
      startReps + rule.repIncrement * weeksElapsed,
      rule.repCap,
    );
    const current = prescription.weightKg ?? ladder[0];
    const atCapAndEasy = hasEasySetAtOrAbove(
      history,
      prescription.exerciseSlug,
      rule.repCap,
      current,
    );
    const nextRung = ladder.find((kg) => kg > current) ?? null;

    return {
      ...base,
      reps,
      weightKg: current,
      readyToStepUp:
        atCapAndEasy && nextRung !== null ? { toWeightKg: nextRung } : null,
    };
  }

  // How many weeks fit below the cap before the reps would overshoot it.
  // Start 8, cap 15, +2 → 8,10,12,14 then reset: a four-week cycle.
  const cycleLength =
    Math.floor((rule.repCap - startReps) / rule.repIncrement) + 1;
  const cycleIndex = Math.floor(weeksElapsed / cycleLength);
  const weekInCycle = weeksElapsed % cycleLength;

  // Past the top of the ladder there is nowhere to step up to, so the reps hold
  // at the cap rather than resetting to a weight that does not exist.
  if (cycleIndex >= ladder.length) {
    return { ...base, reps: rule.repCap, weightKg: ladder[ladder.length - 1] };
  }

  return {
    ...base,
    reps: startReps + rule.repIncrement * weekInCycle,
    weightKg: ladder[cycleIndex],
  };
}

/** Rules 3 and 4. */
function timeThenUnlock(
  base: Target,
  prescription: Prescription,
  rule: TimeThenUnlockProgression,
  week: number,
  history: SetRecord[],
): Target {
  const weeksElapsed = Math.max(0, week - 1);

  const seconds = rule.maxEffort
    ? null // "3× макс" — held to failure, so there is no number to prescribe.
    : Math.min(
        (prescription.seconds ?? 0) + (rule.secondsIncrement ?? 0) * weeksElapsed,
        rule.capSeconds,
      );

  const holdReached = bestDuration(history, prescription.exerciseSlug) >= rule.capSeconds;

  const prerequisitesMet = (rule.unlock.requires ?? []).every((req) =>
    hasCompletedSets(history, req.exercise, req.sets, req.reps),
  );

  return {
    ...base,
    seconds,
    reps: null,
    unlockAvailable:
      holdReached && prerequisitesMet
        ? { exerciseSlug: rule.unlock.replaceWith }
        : null,
  };
}

/** Longest hold ever logged for an exercise. */
function bestDuration(history: SetRecord[], slug: string): number {
  return history
    .filter((s) => s.exerciseSlug === slug)
    .reduce((best, s) => Math.max(best, s.durationSec ?? 0), 0);
}

/** Whether at least `sets` sets of `reps`+ have been logged for an exercise. */
function hasCompletedSets(
  history: SetRecord[],
  slug: string,
  sets: number,
  reps: number,
): boolean {
  return (
    history.filter((s) => s.exerciseSlug === slug && (s.reps ?? 0) >= reps)
      .length >= sets
  );
}

/**
 * Rule 2's condition: the capped set logged as easy, at the current weight.
 *
 * Requiring the weight to match matters — an easy set of 15 at 16 kg says
 * nothing about being ready for 20 kg if the athlete has already moved up.
 */
function hasEasySetAtOrAbove(
  history: SetRecord[],
  slug: string,
  repCap: number,
  weightKg: number,
): boolean {
  return history.some(
    (s) =>
      s.exerciseSlug === slug &&
      s.rpe === "easy" &&
      (s.reps ?? 0) >= repCap &&
      (s.weightKg ?? 0) >= weightKg,
  );
}
