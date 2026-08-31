import "server-only";
import { createClient } from "@/lib/supabase/server";

export type BodyMetric = {
  date: string;
  weightKg: number | null;
  waistCm: number | null;
};

export async function getBodyMetrics(): Promise<BodyMetric[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("body_metrics")
    .select("date, weight_kg, waist_cm")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("date");

  return (data ?? []).map((r) => ({
    date: r.date,
    weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
    waistCm: r.waist_cm === null ? null : Number(r.waist_cm),
  }));
}
