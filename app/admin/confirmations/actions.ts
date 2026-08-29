"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPPLIER_RESPONSE_HOURS } from "@/lib/confirmations";

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

export async function proposeAlternativeSupplier(
  originalConfirmationId: string,
  newSupplierId: string
) {
  const supabase = await requireAdmin();

  const { data: original, error: fetchErr } = await supabase
    .from("booking_supplier_confirmations")
    .select("request_type, request_id, supplier_id")
    .eq("id", originalConfirmationId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  if (original.request_type === "reservation") {
    const { data: reservation, error: resErr } = await supabase
      .from("reservation_requests")
      .select("package_id")
      .eq("id", original.request_id)
      .single();
    if (resErr) throw new Error(resErr.message);

    const { error: unlinkErr } = await supabase
      .from("package_suppliers")
      .delete()
      .eq("package_id", reservation.package_id)
      .eq("supplier_id", original.supplier_id);
    if (unlinkErr) throw new Error(unlinkErr.message);

    const { error: linkErr } = await supabase.from("package_suppliers").insert({
      package_id: reservation.package_id,
      supplier_id: newSupplierId,
    });
    if (linkErr) throw new Error(linkErr.message);
  } else {
    const { error: unlinkErr } = await supabase
      .from("custom_package_request_suppliers")
      .delete()
      .eq("request_id", original.request_id)
      .eq("supplier_id", original.supplier_id);
    if (unlinkErr) throw new Error(unlinkErr.message);

    const { error: linkErr } = await supabase.from("custom_package_request_suppliers").insert({
      request_id: original.request_id,
      supplier_id: newSupplierId,
    });
    if (linkErr) throw new Error(linkErr.message);
  }

  const deadline = new Date(Date.now() + SUPPLIER_RESPONSE_HOURS * 60 * 60 * 1000).toISOString();

  const { error: insertErr } = await supabase.from("booking_supplier_confirmations").insert({
    request_type: original.request_type,
    request_id: original.request_id,
    supplier_id: newSupplierId,
    status: "pending",
    response_deadline: deadline,
    is_alternative_for: originalConfirmationId,
  });
  if (insertErr) throw new Error(insertErr.message);

  revalidatePath("/admin/confirmations");
  revalidatePath("/supplier/requests");
  revalidatePath("/dashboard/requests");
}
