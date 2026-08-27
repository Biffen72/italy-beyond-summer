"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getConfirmationSummaries, type RequestType } from "@/lib/confirmations";

const TABLE_BY_TYPE = {
  reservation: "reservation_requests",
  custom: "custom_package_requests",
} as const;

async function updateRequestStatus(requestType: RequestType, requestId: string, status: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from(TABLE_BY_TYPE[requestType])
    .update({ status })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Couldn't find that request.");

  revalidatePath("/dashboard/requests");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/custom-requests");
  return { ok: true };
}

// Re-checks server-side that every linked supplier has actually said yes
// before allowing the booking to go through — the RLS policy only knows
// the requested status is one of the two allowed values, not whether
// suppliers have confirmed, so that check lives here.
export async function bookRequest(requestType: RequestType, requestId: string) {
  const supabase = await createClient();
  const summaries = await getConfirmationSummaries(supabase, [{ requestType, requestId }]);
  const summary = summaries.get(`${requestType}:${requestId}`);

  if (!summary || summary.status !== "ready_for_customer") {
    throw new Error("Not all suppliers have confirmed availability yet.");
  }

  return updateRequestStatus(requestType, requestId, "confirmed");
}

export async function cancelRequest(requestType: RequestType, requestId: string) {
  return updateRequestStatus(requestType, requestId, "cancelled");
}
