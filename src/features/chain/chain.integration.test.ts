import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { uuidv7 } from "uuidv7";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { currentStreak, longestStreak } from "@/lib/program/streak";

/**
 * Exercises the data path behind the Today screen against the real database.
 *
 * The point that cannot be unit-tested: `daily_chain.is_complete` is a
 * *generated column*, so Postgres — not the app — decides whether the chain held
 * on a given day. This asserts that the database's rule and the pure
 * `isChainComplete`/`currentStreak` logic in src/lib/program/streak.ts agree.
 * If they ever drift, the streak shown to the user would be a lie.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.RLS_TEST_EMAIL_A;
const password = process.env.RLS_TEST_PASSWORD;
const configured = Boolean(url && key && email && password);

// Far-future dates so this never collides with real logged days.
const D = (n: number) => `2999-06-${String(n).padStart(2, "0")}`;

describe.runIf(configured)("daily chain data path", () => {
  let supabase: SupabaseClient<Database>;
  let userId: string;
  let programId: string;
  const createdChainIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient<Database>(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    if (error) throw new Error(`Sign-in failed: ${error.message}`);
    userId = data.user!.id;

    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", "operation-base")
      .single();

    const { data: enrolment, error: enrolError } = await supabase
      .from("user_programs")
      .insert({
        user_id: userId,
        program_id: program!.id,
        start_date: D(1),
      })
      .select("id")
      .single();

    expect(enrolError).toBeNull();
    programId = enrolment!.id;
  });

  afterAll(async () => {
    if (!supabase) return;
    if (createdChainIds.length) {
      await supabase.from("daily_chain").delete().in("id", createdChainIds);
    }
    if (programId) {
      await supabase.from("user_programs").delete().eq("id", programId);
    }
    await supabase.auth.signOut();
  });

  async function logDay(date: string, steps: number, mobilityDone: boolean) {
    const id = uuidv7();
    createdChainIds.push(id);
    const { data, error } = await supabase
      .from("daily_chain")
      .insert({
        id,
        user_id: userId,
        user_program_id: programId,
        date,
        steps,
        mobility_done: mobilityDone,
      })
      .select("is_complete")
      .single();

    expect(error).toBeNull();
    return data!.is_complete;
  }

  it("marks a day complete only at 7000+ steps AND mobility done", async () => {
    // These four cases are the program's rule, evaluated by Postgres.
    expect(await logDay(D(1), 7000, true)).toBe(true);
    expect(await logDay(D(2), 6999, true)).toBe(false);
    expect(await logDay(D(3), 12000, false)).toBe(false);
    expect(await logDay(D(4), 0, false)).toBe(false);
  });

  it("recomputes is_complete when the entry is updated", async () => {
    // The realistic flow: steps get logged in the evening, after the mobility
    // box was ticked in the morning.
    const id = uuidv7();
    createdChainIds.push(id);

    await supabase.from("daily_chain").insert({
      id,
      user_id: userId,
      user_program_id: programId,
      date: D(5),
      steps: 0,
      mobility_done: true,
    });

    const { data: updated } = await supabase
      .from("daily_chain")
      .update({ steps: 8200 })
      .eq("id", id)
      .select("is_complete")
      .single();

    expect(updated?.is_complete).toBe(true);
  });

  it("upserting the same date updates rather than duplicating", async () => {
    // This is what makes an offline retry safe (phase 5) — and what the
    // saveChainEntry action relies on today.
    const id = uuidv7();
    createdChainIds.push(id);

    await supabase.from("daily_chain").upsert(
      { id, user_id: userId, user_program_id: programId, date: D(6), steps: 100 },
      { onConflict: "user_id,date" },
    );
    await supabase.from("daily_chain").upsert(
      { id, user_id: userId, user_program_id: programId, date: D(6), steps: 9000 },
      { onConflict: "user_id,date" },
    );

    const { data } = await supabase
      .from("daily_chain")
      .select("id, steps")
      .eq("user_id", userId)
      .eq("date", D(6));

    expect(data).toHaveLength(1);
    expect(data![0].steps).toBe(9000);
  });

  it("the database's completeness agrees with the pure streak logic", async () => {
    const { data } = await supabase
      .from("daily_chain")
      .select("date, is_complete")
      .eq("user_id", userId)
      .gte("date", D(1))
      .lte("date", D(6))
      .order("date");

    const days = (data ?? []).map((r) => ({
      date: r.date,
      isComplete: r.is_complete ?? false,
    }));

    // Logged above: 01 complete; 02-04 incomplete; 05 complete; 06 has 9000
    // steps but mobility_done defaulted to false — so steps alone do NOT close
    // the chain, which is exactly the program's rule.
    expect(days.filter((d) => d.isComplete).map((d) => d.date)).toEqual([
      D(1),
      D(5),
    ]);

    // The 6th is incomplete, but an unfinished today must not break the streak:
    // counting falls back to the 5th, which is complete. The 4th is not, so it
    // stops there.
    expect(currentStreak(days, D(6))).toBe(1);
    // Asked for on the 4th — itself incomplete, and the 3rd is too.
    expect(currentStreak(days, D(4))).toBe(0);
    // No two complete days are adjacent.
    expect(longestStreak(days)).toBe(1);
  });
});

describe.skipIf(configured)("daily chain data path", () => {
  it.skip("skipped: Supabase env vars not set (see docs/development.md)", () => {});
});
