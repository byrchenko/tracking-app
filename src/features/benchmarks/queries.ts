import "server-only";
import { createClient } from "@/lib/supabase/server";
import { compareBenchmarks, type BenchmarkComparison } from "@/lib/program/benchmarks";

export async function getBenchmarks(
  userProgramId: string,
): Promise<BenchmarkComparison[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return compareBenchmarks([]);

  const { data } = await supabase
    .from("benchmarks")
    .select("test_key, phase, value")
    .eq("user_id", user.id)
    .eq("user_program_id", userProgramId);

  return compareBenchmarks(
    (data ?? []).map((r) => ({
      testKey: r.test_key,
      phase: r.phase as "start" | "end",
      value: Number(r.value),
    })),
  );
}
