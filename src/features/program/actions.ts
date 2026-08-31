"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Enrols the signed-in user in the 42-day program starting on `startDate`.
 *
 * The date is validated server-side rather than trusted from the form: it drives
 * every subsequent schedule calculation, so a malformed value would silently
 * produce a nonsense calendar.
 */
export async function startProgram(formData: FormData) {
  const startDate = String(formData.get("startDate") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { error: "invalid_date" as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_signed_in" as const };

  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", "operation-base")
    .single();

  if (!program) return { error: "program_missing" as const };

  const { error } = await supabase.from("user_programs").insert({
    user_id: user.id,
    program_id: program.id,
    start_date: startDate,
  });

  if (error) return { error: "insert_failed" as const };

  revalidatePath("/", "layout");
  return { error: null };
}
