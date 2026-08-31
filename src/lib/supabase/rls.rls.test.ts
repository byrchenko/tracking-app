import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { uuidv7 } from "uuidv7";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "./database.types";

/**
 * Cross-user Row Level Security tests.
 *
 * These guard the only real security boundary in the app. There is no API tier
 * (ADR 0002), the publishable key ships to every browser, and RLS is the sole
 * thing stopping one user reading another's training log.
 *
 * Everything here runs as an ordinary authenticated user through PostgREST —
 * exactly the access path a real client has. No service_role key is used, on
 * purpose: a test that bypasses RLS would prove nothing about RLS.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const emailA = process.env.RLS_TEST_EMAIL_A;
const emailB = process.env.RLS_TEST_EMAIL_B;
const password = process.env.RLS_TEST_PASSWORD;

const configured = Boolean(url && key && emailA && emailB && password);

async function signIn(email: string): Promise<{
  client: SupabaseClient<Database>;
  userId: string;
}> {
  const client = createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: password!,
  });

  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return { client, userId: data.user!.id };
}

describe.runIf(configured)("Row Level Security", () => {
  let a: Awaited<ReturnType<typeof signIn>>;
  let b: Awaited<ReturnType<typeof signIn>>;

  // Rows owned by user A that user B must never be able to see or touch.
  const chainId = uuidv7();
  const metricId = uuidv7();
  const chainDate = "2999-01-01";
  const metricDate = "2999-01-02";

  beforeAll(async () => {
    a = await signIn(emailA!);
    b = await signIn(emailB!);
    expect(a.userId).not.toBe(b.userId);

    const { error: chainError } = await a.client
      .from("daily_chain")
      .insert({ id: chainId, user_id: a.userId, date: chainDate, steps: 8123, mobility_done: true });
    expect(chainError).toBeNull();

    const { error: metricError } = await a.client
      .from("body_metrics")
      .insert({ id: metricId, user_id: a.userId, date: metricDate, weight_kg: 119 });
    expect(metricError).toBeNull();
  });

  afterAll(async () => {
    // A owns these rows, so A can remove them. Tests share a remote database
    // and must not leave fixtures behind.
    if (!a) return;
    await a.client.from("daily_chain").delete().eq("id", chainId);
    await a.client.from("body_metrics").delete().eq("id", metricId);
    await a.client.auth.signOut();
    await b?.client.auth.signOut();
  });

  it("lets a user read their own rows", async () => {
    const { data, error } = await a.client
      .from("daily_chain")
      .select("id, steps, is_complete")
      .eq("id", chainId)
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ id: chainId, steps: 8123 });
    // Generated column: 8123 steps + mobility done = chain closed.
    expect(data?.is_complete).toBe(true);
  });

  it("hides another user's daily_chain rows entirely", async () => {
    const { data, error } = await b.client
      .from("daily_chain")
      .select("id")
      .eq("id", chainId);

    // RLS filters rather than errors: B gets an empty set, not a 403.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("hides another user's body_metrics rows entirely", async () => {
    const { data, error } = await b.client
      .from("body_metrics")
      .select("id")
      .eq("id", metricId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns no rows at all from an unfiltered select of another user's table", async () => {
    // The realistic leak is a query with no user_id filter — RLS, not the
    // query, must be what scopes it.
    const { data, error } = await b.client.from("daily_chain").select("id");

    expect(error).toBeNull();
    expect(data?.some((row) => row.id === chainId)).toBe(false);
  });

  it("does not let a user update another user's row", async () => {
    const { data, error } = await b.client
      .from("daily_chain")
      .update({ steps: 0 })
      .eq("id", chainId)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]); // matched nothing

    // And the row is genuinely untouched.
    const { data: after } = await a.client
      .from("daily_chain")
      .select("steps")
      .eq("id", chainId)
      .single();
    expect(after?.steps).toBe(8123);
  });

  it("does not let a user delete another user's row", async () => {
    const { error } = await b.client.from("daily_chain").delete().eq("id", chainId);
    expect(error).toBeNull();

    const { data: after } = await a.client
      .from("daily_chain")
      .select("id")
      .eq("id", chainId);
    expect(after).toHaveLength(1);
  });

  it("rejects inserting a row owned by another user", async () => {
    // This is what `with check` is for. Without it, B could write rows into
    // A's account even while unable to read them.
    const { error } = await b.client.from("body_metrics").insert({
      id: uuidv7(),
      user_id: a.userId,
      date: "2999-03-03",
      weight_kg: 1,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501"); // insufficient_privilege
  });

  it("lets both users read the shared program template", async () => {
    for (const user of [a, b]) {
      const { error } = await user.client.from("exercises").select("id").limit(1);
      expect(error).toBeNull();
    }
  });

  it("does not let a user write to the program template", async () => {
    const { error } = await a.client
      .from("exercises")
      .insert({ slug: "should-not-exist", name: { uk: "x", en: "x" }, metric_type: "reps" });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });
});

describe.skipIf(configured)("Row Level Security", () => {
  it.skip("skipped: Supabase env vars not set (see docs/development.md)", () => {});
});
