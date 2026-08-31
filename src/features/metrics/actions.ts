"use server";

import { revalidatePath } from "next/cache";
import { uuidv7 } from "uuidv7";
import { createClient } from "@/lib/supabase/server";

export async function saveBodyMetrics(input: {
  date: string;
  weightKg?: number | null;
  waistCm?: number | null;
}): Promise<{ error: string | null }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "invalid_date" };
  if (input.weightKg != null && (input.weightKg <= 0 || input.weightKg > 400)) {
    return { error: "invalid_value" };
  }
  if (input.waistCm != null && (input.waistCm <= 0 || input.waistCm > 300)) {
    return { error: "invalid_value" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_signed_in" };

  const { data: existing } = await supabase
    .from("body_metrics")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", input.date)
    .maybeSingle();

  const { error } = await supabase.from("body_metrics").upsert(
    {
      id: existing?.id ?? uuidv7(),
      user_id: user.id,
      date: input.date,
      ...(input.weightKg !== undefined ? { weight_kg: input.weightKg } : {}),
      ...(input.waistCm !== undefined ? { waist_cm: input.waistCm } : {}),
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { error: "save_failed" };

  revalidatePath("/", "layout");
  return { error: null };
}
