import { createClient } from "@/lib/supabase/server";

/**
 * Exports everything this user has logged, as JSON.
 *
 * Six weeks of effort should not be locked inside someone else's database. RLS
 * scopes every query to the caller, so this can only ever export your own rows.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "not_signed_in" }, { status: 401 });
  }

  const [programs, chain, metrics, benchmarks, sessions, sets] = await Promise.all([
    supabase.from("user_programs").select("*").eq("user_id", user.id),
    supabase.from("daily_chain").select("*").eq("user_id", user.id).order("date"),
    supabase.from("body_metrics").select("*").eq("user_id", user.id).order("date"),
    supabase.from("benchmarks").select("*").eq("user_id", user.id),
    supabase.from("sessions").select("*").eq("user_id", user.id).order("scheduled_date"),
    supabase
      .from("set_logs")
      .select("*, exercises(slug)")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    program: "operation-base",
    userPrograms: programs.data ?? [],
    dailyChain: chain.data ?? [],
    bodyMetrics: metrics.data ?? [],
    benchmarks: benchmarks.data ?? [],
    sessions: sessions.data ?? [],
    setLogs: sets.data ?? [],
  };

  const filename = `operation-base-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Personal training data — never let a CDN or proxy hold a copy.
      "Cache-Control": "no-store, private",
    },
  });
}
