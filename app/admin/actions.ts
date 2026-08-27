"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  return supabase;
}

export async function approveTranslation(translationId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("supplier_translations")
    .update({ status: "approved" })
    .eq("id", translationId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function rejectTranslation(translationId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("supplier_translations")
    .update({ status: "rejected" })
    .eq("id", translationId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
