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

export async function setReservationStatus(
  requestId: string,
  status: "confirmed" | "declined" | "cancelled"
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("reservation_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reservations");
}

export async function setInvoiceStatus(
  requestId: string,
  invoiceStatus: "not_invoiced" | "invoiced" | "paid"
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("reservation_requests")
    .update({ invoice_status: invoiceStatus })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/finance");
}
