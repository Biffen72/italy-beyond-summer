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

export type ItineraryDayInput = {
  dayNumber: number;
  title: string;
  description: string;
};

type PackageInput = {
  title: string;
  packageType: string;
  nights: number;
  baseRegion: string;
  priceEur: number;
  description: string;
  supplierIds: string[];
  itinerary: ItineraryDayInput[];
};

async function syncPackageSuppliers(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  packageId: string,
  supplierIds: string[]
) {
  const { error: deleteErr } = await supabase
    .from("package_suppliers")
    .delete()
    .eq("package_id", packageId);
  if (deleteErr) throw new Error(deleteErr.message);

  if (supplierIds.length === 0) return;

  const { error: insertErr } = await supabase.from("package_suppliers").insert(
    supplierIds.map((supplierId, index) => ({
      package_id: packageId,
      supplier_id: supplierId,
      sort_order: index,
    }))
  );
  if (insertErr) throw new Error(insertErr.message);
}

async function syncPackageItinerary(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  packageId: string,
  itinerary: ItineraryDayInput[]
) {
  const { error: deleteErr } = await supabase
    .from("package_itinerary_days")
    .delete()
    .eq("package_id", packageId);
  if (deleteErr) throw new Error(deleteErr.message);

  if (itinerary.length === 0) return;

  const { error: insertErr } = await supabase.from("package_itinerary_days").insert(
    itinerary.map((day) => ({
      package_id: packageId,
      day_number: day.dayNumber,
      title: day.title,
      description: day.description || null,
    }))
  );
  if (insertErr) throw new Error(insertErr.message);
}

export async function createPackage(input: PackageInput) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("packages")
    .insert({
      title: input.title,
      package_type: input.packageType,
      nights: input.nights,
      base_region: input.baseRegion,
      price_eur: input.priceEur,
      description: input.description,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await syncPackageSuppliers(supabase, data.id, input.supplierIds);
  await syncPackageItinerary(supabase, data.id, input.itinerary);

  revalidatePath("/admin/packages");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/packages");
}

export async function updatePackage(packageId: string, input: PackageInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("packages")
    .update({
      title: input.title,
      package_type: input.packageType,
      nights: input.nights,
      base_region: input.baseRegion,
      price_eur: input.priceEur,
      description: input.description,
    })
    .eq("id", packageId);
  if (error) throw new Error(error.message);

  await syncPackageSuppliers(supabase, packageId, input.supplierIds);
  await syncPackageItinerary(supabase, packageId, input.itinerary);

  revalidatePath("/admin/packages");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/packages");
}

export async function deletePackage(packageId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("packages").delete().eq("id", packageId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/packages");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/packages");
}

export async function setPackageActive(packageId: string, active: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("packages")
    .update({ active })
    .eq("id", packageId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/packages");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/packages");
}
