"use server";

import { createClient } from "@/lib/supabase/server";
import { createConfirmationRows } from "@/lib/confirmations";

export async function submitCustomPackageRequest(input: {
  baseRegion: string;
  nights: number;
  groupSize: number | null;
  supplierIds: string[];
  singleRoom?: boolean;
  travelMonth: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) throw new Error("Your account isn't linked to an agency");

  const { data: request, error } = await supabase
    .from("custom_package_requests")
    .insert({
      agency_id: profile.agency_id,
      base_region: input.baseRegion,
      nights: input.nights,
      group_size: input.groupSize,
      single_room: input.singleRoom ?? false,
      travel_month: input.travelMonth,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (input.supplierIds.length > 0) {
    const { error: linkErr } = await supabase.from("custom_package_request_suppliers").insert(
      input.supplierIds.map((supplierId) => ({
        request_id: request.id,
        supplier_id: supplierId,
      }))
    );
    if (linkErr) throw new Error(linkErr.message);
  }

  await createConfirmationRows(supabase, "custom", request.id, input.supplierIds);

  return { ok: true };
}
