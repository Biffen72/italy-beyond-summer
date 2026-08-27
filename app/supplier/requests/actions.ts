"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The RLS update policy already scopes this to the caller's own supplier
// row, so an update that affects 0 rows means the confirmation either
// doesn't exist or isn't theirs — surfaced as one clean error either way.
export async function respondToConfirmation(confirmationId: string, response: "yes" | "no") {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("booking_supplier_confirmations")
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq("id", confirmationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Couldn't find that request.");

  revalidatePath("/supplier/requests");
  revalidatePath("/supplier");
  return { ok: true };
}
