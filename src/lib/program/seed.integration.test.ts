import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Guards the seeded program against drift from docs/program/operation-6-weeks.md.
 *
 * The document is the source of truth. These expectations are transcribed from
 * it directly, so if someone edits the seed without editing the program — or
 * vice versa — this fails and says which line disagrees.
 *
 * Read-only, but it still signs in: the program template policy is
 * `for select to authenticated`, so an anonymous client correctly sees nothing.
 * Querying as a real user is also the truer test — it exercises the same path
 * the app takes.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.RLS_TEST_EMAIL_A;
const password = process.env.RLS_TEST_PASSWORD;
const configured = Boolean(url && key && email && password);

/** Transcribed from the "СИЛА — ДЕНЬ А" / "СИЛА — ДЕНЬ Б" tables. */
const EXPECTED = {
  strength_a: [
    // "Станова з гирею (тиждень 1–2) → Мах гирею (з тижня 3) | 3×10 → 5×10 | 16 кг"
    { ord: 1, slug: "kettlebell-deadlift", sets: 3, reps: 10, kg: 16, from: 1, to: 2 },
    { ord: 1, slug: "kettlebell-swing", sets: 5, reps: 10, kg: 16, from: 3, to: null },
    // "Присід із гирею до лавки (гоблет) | 3×8 | 12 кг"
    { ord: 2, slug: "goblet-squat", sets: 3, reps: 8, kg: 12, from: 1, to: null },
    // "Жим гантелей лежачи на підлозі | 3×10 | 10–12 кг"
    { ord: 3, slug: "floor-press", sets: 3, reps: 10, kg: 10, from: 1, to: null },
    // "Австралійська тяга під турніком | 3×8 | своя вага"
    { ord: 4, slug: "australian-row", sets: 3, reps: 8, kg: null, from: 1, to: null },
    // "Утримання на брусах (руки прямі) | 3×20 сек | своя вага"
    { ord: 5, slug: "dip-support-hold", sets: 3, reps: null, kg: null, from: 1, to: null },
    // "Фермерська хода | 2×40 м | 20+20 кг"
    { ord: 6, slug: "farmers-walk", sets: 2, reps: null, kg: 20, from: 1, to: null },
  ],
  strength_b: [
    // "Зашагування на лаву | 3×10 на ногу | 10 кг у руках"
    { ord: 1, slug: "step-up", sets: 3, reps: 10, kg: 10, from: 1, to: null },
    // "Тяга гирі в нахилі, одна рука | 3×10 на руку | 16 кг"
    { ord: 2, slug: "kettlebell-row", sets: 3, reps: 10, kg: 16, from: 1, to: null },
    // "Віджимання з упором на лаву | 3×10 | своя вага"
    { ord: 3, slug: "incline-push-up", sets: 3, reps: 10, kg: null, from: 1, to: null },
    // "Румунська тяга з гантелями | 3×10 | 15 кг"
    { ord: 4, slug: "romanian-deadlift", sets: 3, reps: 10, kg: 15, from: 1, to: null },
    // "Вис на турніку | 3× макс | своя вага"
    { ord: 5, slug: "bar-hang", sets: 3, reps: null, kg: null, from: 1, to: null },
    // "«Мертвий жук» | 3×10 | —"
    { ord: 6, slug: "dead-bug", sets: 3, reps: 10, kg: null, from: 1, to: null },
    // "Валіза-хода (гиря в одній руці) | 2×30 м на руку | 20 кг"
    { ord: 7, slug: "suitcase-carry", sets: 2, reps: null, kg: 20, from: 1, to: null },
  ],
} as const;

/** "на ногу" / "на руку" in the program. */
const PER_SIDE = new Set(["step-up", "kettlebell-row", "suitcase-carry"]);

describe.runIf(configured)("seeded program matches the program document", () => {
  const supabase = createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    if (error) throw new Error(`Could not sign in: ${error.message}`);
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  async function prescriptions(dayType: "strength_a" | "strength_b") {
    const { data, error } = await supabase
      .from("program_exercises")
      .select(
        "order_index, target_sets, target_reps, target_weight_kg, per_side, active_from_week, active_to_week, exercises(slug), program_days!inner(day_type)",
      )
      .eq("program_days.day_type", dayType)
      .order("order_index")
      .order("active_from_week");

    expect(error).toBeNull();
    return data ?? [];
  }

  it.each(["strength_a", "strength_b"] as const)(
    "%s matches the document table",
    async (dayType) => {
      const rows = await prescriptions(dayType);
      const expected = EXPECTED[dayType];

      expect(rows).toHaveLength(expected.length);

      rows.forEach((row, i) => {
        const want = expected[i];
        expect(row.exercises?.slug, `slot ${want.ord}`).toBe(want.slug);
        expect(row.order_index).toBe(want.ord);
        expect(row.target_sets).toBe(want.sets);
        expect(row.target_reps).toBe(want.reps);
        expect(
          row.target_weight_kg === null ? null : Number(row.target_weight_kg),
        ).toBe(want.kg);
        expect(row.active_from_week).toBe(want.from);
        expect(row.active_to_week).toBe(want.to);
        expect(row.per_side).toBe(PER_SIDE.has(want.slug));
      });
    },
  );

  it("swaps the kettlebell deadlift for swings at week 3, in the same slot", async () => {
    const rows = await prescriptions("strength_a");
    const slotOne = rows.filter((r) => r.order_index === 1);

    // Same slot, complementary windows, no gap and no overlap.
    expect(slotOne).toHaveLength(2);
    expect(slotOne[0].exercises?.slug).toBe("kettlebell-deadlift");
    expect(slotOne[0].active_to_week).toBe(2);
    expect(slotOne[1].exercises?.slug).toBe("kettlebell-swing");
    expect(slotOne[1].active_from_week).toBe(3);
  });

  it("prescribes five sets of swings, not three", async () => {
    // The document steps 3×10 up to 5×10 at the same time as the swap; getting
    // this wrong silently under-prescribes a third of the work.
    const rows = await prescriptions("strength_a");
    const swing = rows.find((r) => r.exercises?.slug === "kettlebell-swing");
    expect(swing?.target_sets).toBe(5);
  });

  it("covers every day type in the weekly cycle", async () => {
    const { data, error } = await supabase.from("program_days").select("day_type");
    expect(error).toBeNull();
    expect(new Set(data?.map((d) => d.day_type))).toEqual(
      new Set(["strength_a", "strength_b", "walk", "long_walk", "rest"]),
    );
  });
});

describe.skipIf(configured)("seeded program", () => {
  it.skip("skipped: Supabase env vars not set (see docs/development.md)", () => {});
});
