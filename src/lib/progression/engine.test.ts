import { describe, expect, it } from "vitest";
import { computeTarget } from "./engine";
import type { Prescription, Progression, SetRecord } from "./types";

/**
 * These expectations come from ПРАВИЛА ПРОГРЕСІЇ in
 * docs/program/operation-6-weeks.md. Where the document is silent, the test
 * says so explicitly rather than quietly asserting an invention.
 */

function prescribe(over: Partial<Prescription> & { progression: Progression }): Prescription {
  return {
    exerciseSlug: "test-exercise",
    sets: 3,
    reps: 8,
    weightKg: null,
    seconds: null,
    distanceM: null,
    perSide: false,
    ...over,
  };
}

const repsRule: Progression = {
  type: "reps_then_weight",
  repIncrement: 2,
  cadence: "week",
  repCap: 15,
  weightLadderKg: [12, 16, 20],
};

/** Run one prescription across all six weeks. */
function acrossWeeks(prescription: Prescription, history: SetRecord[] = []) {
  return [1, 2, 3, 4, 5, 6].map((week) =>
    computeTarget({ prescription, week, history }),
  );
}

describe("rule 1 — +2 reps per week, then next weight", () => {
  it("adds two reps each week", () => {
    const weeks = acrossWeeks(
      prescribe({ reps: 8, weightKg: 12, progression: repsRule }),
    );
    expect(weeks.slice(0, 4).map((w) => w.reps)).toEqual([8, 10, 12, 14]);
  });

  it("steps up the weight and resets reps rather than exceeding 15", () => {
    // "Дійшов до 15 — переходь на наступну вагу і повертайся до стартових
    // повторень." Starting at 8, +2 would reach 16 in week 5 — so week 5 takes
    // the next weight and restarts.
    const weeks = acrossWeeks(
      prescribe({ reps: 8, weightKg: 12, progression: repsRule }),
    );

    expect(weeks.map((w) => w.reps)).toEqual([8, 10, 12, 14, 8, 10]);
    expect(weeks.map((w) => w.weightKg)).toEqual([12, 12, 12, 12, 16, 16]);
  });

  it("never prescribes more than the rep cap", () => {
    const weeks = acrossWeeks(
      prescribe({ reps: 8, weightKg: 12, progression: repsRule }),
    );
    for (const week of weeks) {
      expect(week.reps!).toBeLessThanOrEqual(15);
    }
  });

  it("handles a higher starting rep count (floor press, 3×10)", () => {
    // 10,12,14 then step up — a three-week cycle rather than four.
    const weeks = acrossWeeks(
      prescribe({
        reps: 10,
        weightKg: 10,
        progression: { ...repsRule, weightLadderKg: [10, 12, 15, 20, 25] },
      }),
    );
    expect(weeks.map((w) => w.reps)).toEqual([10, 12, 14, 10, 12, 14]);
    expect(weeks.map((w) => w.weightKg)).toEqual([10, 10, 10, 12, 12, 12]);
  });

  it("holds at the cap on the top rung instead of resetting to a weight that does not exist", () => {
    const weeks = acrossWeeks(
      prescribe({
        reps: 8,
        weightKg: 20,
        progression: { ...repsRule, weightLadderKg: [20] },
      }),
    );
    expect(weeks.map((w) => w.weightKg)).toEqual([20, 20, 20, 20, 20, 20]);
    expect(weeks[4].reps).toBe(15);
    expect(weeks[5].reps).toBe(15);
  });

  it("progresses on the calendar, not on attendance", () => {
    // "Пропустив день — ідеш далі за планом. Ніяких подвійних обсягів для
    // надолуження." An empty history must not hold week 4 back to week 1.
    const target = computeTarget({
      prescription: prescribe({ reps: 8, weightKg: 12, progression: repsRule }),
      week: 4,
      history: [],
    });
    expect(target.reps).toBe(14);
  });
});

describe("rule 1 — bodyweight exercises with no weight ladder", () => {
  const bodyweight = prescribe({
    exerciseSlug: "australian-row",
    reps: 8,
    weightKg: null,
    progression: { ...repsRule, weightLadderKg: [] },
  });

  it("rises to 15 and holds there", () => {
    // This is what makes australian rows reach 3×15 — the second half of the
    // pull-up unlock condition in rule 3.
    const weeks = acrossWeeks(bodyweight);
    expect(weeks.map((w) => w.reps)).toEqual([8, 10, 12, 14, 15, 15]);
    expect(weeks.every((w) => w.weightKg === null)).toBe(true);
  });

  it("never suggests a step-up when there is no ladder", () => {
    expect(acrossWeeks(bodyweight).every((w) => w.readyToStepUp === null)).toBe(true);
  });
});

describe("rule 2 — kettlebell swings step up on effort, not on the calendar", () => {
  const swing = prescribe({
    exerciseSlug: "kettlebell-swing",
    sets: 5,
    reps: 10,
    weightKg: 16,
    progression: {
      type: "reps_then_weight",
      repIncrement: 2,
      cadence: "week",
      repCap: 15,
      weightLadderKg: [16, 20],
      stepUpWhen: "rpe_easy",
    },
  });

  it("holds 16 kg through all six weeks with no easy set logged", () => {
    // "коли 5×15 стає легко, бери 20 кг" — until then, the weight stays.
    const weeks = acrossWeeks(swing);
    expect(weeks.every((w) => w.weightKg === 16)).toBe(true);
    expect(weeks.every((w) => w.readyToStepUp === null)).toBe(true);
  });

  it("climbs reps to the cap and holds", () => {
    expect(acrossWeeks(swing).map((w) => w.reps)).toEqual([10, 12, 14, 15, 15, 15]);
  });

  it("suggests 20 kg once 15 reps at 16 kg is logged as easy", () => {
    const history: SetRecord[] = [
      { exerciseSlug: "kettlebell-swing", reps: 15, weightKg: 16, durationSec: null, rpe: "easy" },
    ];
    const target = computeTarget({ prescription: swing, week: 5, history });

    expect(target.readyToStepUp).toEqual({ toWeightKg: 20 });
    // Suggested, not applied — the athlete takes the heavier bell.
    expect(target.weightKg).toBe(16);
  });

  it("does not suggest a step-up for a hard or merely ok set at the cap", () => {
    for (const rpe of ["ok", "hard"] as const) {
      const history: SetRecord[] = [
        { exerciseSlug: "kettlebell-swing", reps: 15, weightKg: 16, durationSec: null, rpe },
      ];
      expect(
        computeTarget({ prescription: swing, week: 5, history }).readyToStepUp,
      ).toBeNull();
    }
  });

  it("does not suggest a step-up for an easy set below the cap", () => {
    const history: SetRecord[] = [
      { exerciseSlug: "kettlebell-swing", reps: 12, weightKg: 16, durationSec: null, rpe: "easy" },
    ];
    expect(
      computeTarget({ prescription: swing, week: 5, history }).readyToStepUp,
    ).toBeNull();
  });

  it("ignores easy sets logged for a different exercise", () => {
    const history: SetRecord[] = [
      { exerciseSlug: "goblet-squat", reps: 15, weightKg: 16, durationSec: null, rpe: "easy" },
    ];
    expect(
      computeTarget({ prescription: swing, week: 5, history }).readyToStepUp,
    ).toBeNull();
  });

  it("stops suggesting once the top of the ladder is reached", () => {
    const atTop = prescribe({
      ...swing,
      weightKg: 20,
      progression: swing.progression,
    });
    const history: SetRecord[] = [
      { exerciseSlug: "kettlebell-swing", reps: 15, weightKg: 20, durationSec: null, rpe: "easy" },
    ];
    expect(
      computeTarget({ prescription: atTop, week: 6, history }).readyToStepUp,
    ).toBeNull();
  });
});

describe("rule 3 — negative pull-ups need BOTH conditions", () => {
  const barHang = prescribe({
    exerciseSlug: "bar-hang",
    sets: 3,
    reps: null,
    seconds: null,
    progression: {
      type: "time_then_unlock",
      cadence: "week",
      capSeconds: 60,
      maxEffort: true,
      unlock: {
        replaceWith: "negative-pull-up",
        requires: [{ exercise: "australian-row", sets: 3, reps: 15 }],
      },
    },
  });

  const hang60: SetRecord = {
    exerciseSlug: "bar-hang", reps: null, weightKg: null, durationSec: 60, rpe: null,
  };
  const rows15 = Array.from({ length: 3 }, (): SetRecord => ({
    exerciseSlug: "australian-row", reps: 15, weightKg: null, durationSec: null, rpe: null,
  }));

  it("prescribes no time — the program says 3× макс", () => {
    expect(computeTarget({ prescription: barHang, week: 1, history: [] }).seconds).toBeNull();
  });

  it("does not unlock on the hang alone", () => {
    expect(
      computeTarget({ prescription: barHang, week: 6, history: [hang60] }).unlockAvailable,
    ).toBeNull();
  });

  it("does not unlock on the rows alone", () => {
    expect(
      computeTarget({ prescription: barHang, week: 6, history: rows15 }).unlockAvailable,
    ).toBeNull();
  });

  it("unlocks when the hang reaches 60s AND rows reach 3×15", () => {
    const target = computeTarget({
      prescription: barHang,
      week: 6,
      history: [hang60, ...rows15],
    });
    expect(target.unlockAvailable).toEqual({ exerciseSlug: "negative-pull-up" });
  });

  it("does not unlock on a 59-second hang", () => {
    const almost: SetRecord = { ...hang60, durationSec: 59 };
    expect(
      computeTarget({ prescription: barHang, week: 6, history: [almost, ...rows15] })
        .unlockAvailable,
    ).toBeNull();
  });

  it("does not unlock on only two sets of 15 rows", () => {
    expect(
      computeTarget({
        prescription: barHang,
        week: 6,
        history: [hang60, ...rows15.slice(0, 2)],
      }).unlockAvailable,
    ).toBeNull();
  });

  it("counts the best hang ever logged, not the most recent", () => {
    const later: SetRecord = { ...hang60, durationSec: 20 };
    expect(
      computeTarget({
        prescription: barHang,
        week: 6,
        history: [hang60, later, ...rows15],
      }).unlockAvailable,
    ).toEqual({ exerciseSlug: "negative-pull-up" });
  });
});

describe("rule 4 — negative dips need only the 60-second hold", () => {
  const dipHold = prescribe({
    exerciseSlug: "dip-support-hold",
    sets: 3,
    reps: null,
    seconds: 20,
    progression: {
      type: "time_then_unlock",
      cadence: "week",
      capSeconds: 60,
      secondsIncrement: 5,
      unlock: { replaceWith: "negative-dip" },
    },
  });

  it("adds five seconds a week, capped at sixty", () => {
    // NOTE: the program specifies "+2 повторення щотижня" for reps but gives no
    // increment for timed holds. Five seconds a week is this app's
    // interpretation, and it lives in the seed so it can be changed as data.
    expect(acrossWeeks(dipHold).map((w) => w.seconds)).toEqual([20, 25, 30, 35, 40, 45]);
  });

  it("unlocks negative dips at a 60-second hold, with no other condition", () => {
    const history: SetRecord[] = [
      { exerciseSlug: "dip-support-hold", reps: null, weightKg: null, durationSec: 60, rpe: null },
    ];
    expect(
      computeTarget({ prescription: dipHold, week: 3, history }).unlockAvailable,
    ).toEqual({ exerciseSlug: "negative-dip" });
  });

  it("does not unlock below 60 seconds", () => {
    const history: SetRecord[] = [
      { exerciseSlug: "dip-support-hold", reps: null, weightKg: null, durationSec: 45, rpe: null },
    ];
    expect(
      computeTarget({ prescription: dipHold, week: 6, history }).unlockAvailable,
    ).toBeNull();
  });
});

describe("fixed progression — carries, core and walks", () => {
  const carry = prescribe({
    exerciseSlug: "farmers-walk",
    sets: 2,
    reps: null,
    weightKg: 20,
    distanceM: 40,
    progression: { type: "fixed" },
  });

  it("returns the prescription unchanged every week", () => {
    for (const week of acrossWeeks(carry)) {
      expect(week).toMatchObject({
        sets: 2,
        weightKg: 20,
        distanceM: 40,
        readyToStepUp: null,
        unlockAvailable: null,
      });
    }
  });

  it("carries the note through", () => {
    const withNote = prescribe({
      progression: { type: "fixed", note: "75-90 min, or 60 min with an 8 kg pack" },
    });
    expect(computeTarget({ prescription: withNote, week: 4, history: [] }).note).toBe(
      "75-90 min, or 60 min with an 8 kg pack",
    );
  });
});

describe("per-side prescriptions", () => {
  it("preserves the per-side flag through progression", () => {
    // "3×10 на ногу" must stay per-side after the reps increase, or the volume
    // silently halves.
    const stepUp = prescribe({
      exerciseSlug: "step-up",
      reps: 10,
      weightKg: 10,
      perSide: true,
      progression: { ...repsRule, weightLadderKg: [10, 12, 15, 20] },
    });
    expect(acrossWeeks(stepUp).every((w) => w.perSide)).toBe(true);
  });
});
