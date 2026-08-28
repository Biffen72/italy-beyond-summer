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

export async function addCategory(input: {
  kind: "package" | "supplier";
  value: string;
  label: string;
  icon: string | null;
  imageUrl: string | null;
  showOnHomepage: boolean;
}) {
  const supabase = await requireAdmin();

  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("kind", input.kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("categories").insert({
    kind: input.kind,
    value: input.value,
    label: input.label,
    icon: input.icon,
    image_url: input.imageUrl,
    show_on_homepage: input.showOnHomepage,
    sort_order: nextSortOrder,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/packages");
  revalidatePath("/admin/packages");
  revalidatePath("/supplier");
}

export async function updateCategoryImage(id: string, imageUrl: string | null) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("categories")
    .update({ image_url: imageUrl })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  revalidatePath("/dashboard");
}

export async function deleteCategory(id: string, kind: "package" | "supplier", value: string) {
  const supabase = await requireAdmin();

  const table = kind === "package" ? "packages" : "suppliers";
  const column = kind === "package" ? "package_type" : "category";
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (count && count > 0) {
    throw new Error(
      `Can't delete — ${count} ${kind === "package" ? "package(s)" : "supplier(s)"} still use this category.`
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/packages");
  revalidatePath("/admin/packages");
  revalidatePath("/supplier");
}
