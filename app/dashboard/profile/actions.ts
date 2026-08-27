"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type AgencyProfileInput = {
  agencyId: string;
  name: string;
  address: string;
  city: string;
  country: "NO" | "SE" | "DK" | "";
  mobilePhone: string;
  contactEmail: string;
  billingAddress: string;
  electronicInvoiceAddress: string;
  logoUrl: string | null;
};

export async function updateAgencyProfile(input: AgencyProfileInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.agency_id !== input.agencyId) {
    throw new Error("Not authorized");
  }

  const { error } = await supabase
    .from("agencies")
    .update({
      name: input.name,
      address: input.address,
      city: input.city,
      country: input.country || null,
      mobile_phone: input.mobilePhone,
      contact_email: input.contactEmail,
      billing_address: input.billingAddress,
      electronic_invoice_address: input.electronicInvoiceAddress,
      logo_url: input.logoUrl,
    })
    .eq("id", input.agencyId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin/agencies");
  return { ok: true };
}
