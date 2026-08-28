"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getConfirmationSummaries, type RequestType } from "@/lib/confirmations";
import { REGION_LABEL } from "@/lib/regions";

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

function addNightsToDate(dateStr: string, nights: number) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nights);
  return date.toISOString().slice(0, 10);
}

// Creates the Project row a booked request unlocks. Failures here are
// logged, not thrown — the booking itself already succeeded, and the
// agency can still be pointed at the project once it exists.
async function createProjectForRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestType: RequestType,
  requestId: string
) {
  try {
    let agencyId: string;
    let name: string;
    let startDate: string | null;
    let nights: number | null;
    let groupSize: number | null;
    let packageId: string | null = null;

    if (requestType === "reservation") {
      const { data } = await supabase
        .from("reservation_requests")
        .select("agency_id, package_id, travel_month, group_size, packages(title, nights)")
        .eq("id", requestId)
        .single();
      if (!data) return;
      const pkg = data.packages as unknown as { title: string; nights: number } | null;
      agencyId = data.agency_id;
      name = pkg?.title ?? "Package trip";
      startDate = data.travel_month;
      nights = pkg?.nights ?? null;
      groupSize = data.group_size;
      packageId = data.package_id;
    } else {
      const { data } = await supabase
        .from("custom_package_requests")
        .select("agency_id, travel_month, group_size, base_region, nights")
        .eq("id", requestId)
        .single();
      if (!data) return;
      agencyId = data.agency_id;
      name = `Custom trip — ${REGION_LABEL[data.base_region] ?? data.base_region}`;
      startDate = data.travel_month;
      nights = data.nights;
      groupSize = data.group_size;
    }

    const endDate = startDate && nights ? addNightsToDate(startDate, nights) : null;

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        request_type: requestType,
        request_id: requestId,
        agency_id: agencyId,
        name,
        start_date: startDate,
        end_date: endDate,
        group_size: groupSize,
      })
      .select("id")
      .single();
    if (error) {
      console.error("Failed to create project for booked request:", error.message);
      return;
    }

    // Seed the day-by-day program from the package's own itinerary, if it
    // has one — the agency edits/assigns suppliers from there rather than
    // starting from a blank page.
    if (packageId) {
      const { data: itineraryDays } = await supabase
        .from("package_itinerary_days")
        .select("day_number, title, description")
        .eq("package_id", packageId)
        .order("day_number");

      if (itineraryDays && itineraryDays.length > 0) {
        await supabase.from("project_program_days").insert(
          itineraryDays.map((d) => ({
            project_id: project.id,
            day_number: d.day_number,
            title: d.title,
            description: d.description,
          }))
        );
      }
    }
  } catch (err) {
    console.error("Failed to create project for booked request:", err);
  }
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

  const result = await updateRequestStatus(requestType, requestId, "confirmed");
  await createProjectForRequest(supabase, requestType, requestId);
  revalidatePath("/dashboard/projects");
  return result;
}

export async function cancelRequest(requestType: RequestType, requestId: string) {
  return updateRequestStatus(requestType, requestId, "cancelled");
}
