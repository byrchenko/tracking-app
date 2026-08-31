"use server";

import { revalidatePath } from "next/cache";
import { uuidv7 } from "uuidv7";
import { createClient } from "@/lib/supabase/server";
import { BENCHMARK_TESTS } from "@/lib/program/benchmarks";

export async function saveBenchmark(input: {
  userProgramId: string;
  testKey: string;
  phase: "start" | "end";
  value: number;
}): Promise<{ error: string | null }> {
  const test = BENCHMARK_TESTS.find((t) => t.key === input.testKey);
  if (!test) return { error: "unknown_test" };
  if (!Number.isFinite(input.value) || input.value < 0 || input.value > 100_000) {
    return { error: "invalid_value" };
  }
  if (input.phase !== "start" && input.phase !== "end") {
    return { error: "invalid_phase" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_signed_in" };

  const { data: existing } = await supabase
    .from("benchmarks")
    .select("id")
    .eq("user_program_id", input.userProgramId)
    .eq("test_key", input.testKey)
    .eq("phase", input.phase)
    .maybeSingle();

  const { error } = await supabase.from("benchmarks").upsert(
    {
      id: existing?.id ?? uuidv7(),
      user_id: user.id,
      user_program_id: input.userProgramId,
      test_key: input.testKey,
      phase: input.phase,
      value: input.value,
      unit: test.unit,
    },
    { onConflict: "user_program_id,test_key,phase" },
  );

  if (error) return { error: "save_failed" };

  revalidatePath("/", "layout");
  return { error: null };
}
