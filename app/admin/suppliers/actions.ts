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

export async function setSupplierStatus(
  supplierId: string,
  status: "pending" | "active" | "inactive"
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("suppliers")
    .update({ status })
    .eq("id", supplierId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/suppliers");
}
