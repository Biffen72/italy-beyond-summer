"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

export async function setViewAs(formData: FormData) {
  const supabase = await requireAdmin();

  const type = formData.get("type") as "agency" | "supplier";
  const id = formData.get("id") as string;
  if (!id) throw new Error("Select someone to view as.");

  const table = type === "agency" ? "agencies" : "suppliers";
  const { data: target } = await supabase.from(table).select("name").eq("id", id).single();
  if (!target) throw new Error("Not found.");

  const cookieStore = await cookies();
  cookieStore.set("view_as", JSON.stringify({ type, id, label: target.name }), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  redirect(type === "agency" ? "/dashboard" : "/supplier");
}

export async function clearViewAs() {
  await requireAdmin();

  const cookieStore = await cookies();
  cookieStore.delete("view_as");

  redirect("/admin");
}
