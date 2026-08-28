import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getConfirmationSummaries } from "@/lib/confirmations";
import { REGION_LABEL } from "@/lib/regions";
import { BookOrCancelButtons } from "./BookOrCancelButtons";
import { resolveAgencyId } from "@/lib/viewAs";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Booked",
  declined: "Declined",
  cancelled: "Cancelled",
  contacted: "Contacted",
  closed: "Closed",
};

function confirmationLine(summary: { status: string; total: number; yesCount: number } | undefined) {
  if (!summary || summary.total === 0) return null;
  if (summary.status === "ready_for_customer") {
    return "All suppliers confirmed — ready to book!";
  }
  if (summary.status === "declined_by_supplier") {
    return "One or more suppliers can't fit this — we'll follow up shortly.";
  }
  return `Waiting for suppliers (${summary.yesCount}/${summary.total} confirmed)`;
}

export default async function MyRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { agencyId, viewingAs } = await resolveAgencyId(supabase, user!.id);

  if (!agencyId) {
    return (
      <section className="px-6 py-10 md:px-12">
        <p className="text-ink/60">Your account isn&apos;t linked to an agency.</p>
      </section>
    );
  }

  const { data: reservations } = await supabase
    .from("reservation_requests")
    .select("id, travel_month, group_size, single_room, status, created_at, packages(title)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  const { data: customRequests } = await supabase
    .from("custom_package_requests")
    .select("id, travel_month, group_size, single_room, status, base_region, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  const summaries = await getConfirmationSummaries(supabase, [
    ...(reservations ?? []).map((r) => ({ requestType: "reservation" as const, requestId: r.id })),
    ...(customRequests ?? []).map((r) => ({ requestType: "custom" as const, requestId: r.id })),
  ]);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, request_type, request_id")
    .eq("agency_id", agencyId);
  const projectIdByRequest = new Map(
    (projects ?? []).map((p) => [`${p.request_type}:${p.request_id}`, p.id])
  );

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">My requests</h1>
      <p className="mt-1 text-ink/60">
        Reservations and custom package requests you&apos;ve sent.
      </p>

      <div className="mt-8 max-w-2xl space-y-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Package reservations
          </h2>
          {!reservations || reservations.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No reservation requests yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {reservations.map((r) => {
                const pkg = r.packages as unknown as { title: string } | null;
                const summary = summaries.get(`reservation:${r.id}`);
                const line = confirmationLine(summary);
                const bookable = r.status === "pending" && summary?.status === "ready_for_customer";
                const projectId = projectIdByRequest.get(`reservation:${r.id}`);
                return (
                  <li key={r.id} className="rounded-card border border-line bg-white p-4">
                    <p className="font-semibold text-ink">{pkg?.title ?? "Package"}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      {r.travel_month}
                      {r.group_size ? ` · group of ${r.group_size}` : ""}
                      {r.single_room ? " · single room" : ""}
                      {" · "}
                      {STATUS_LABEL[r.status] ?? r.status}
                    </p>
                    {r.status === "pending" && line && (
                      <p className="mt-2 text-sm text-ink/80">{line}</p>
                    )}
                    {bookable && (
                      <div className="mt-3">
                        {viewingAs ? (
                          <p className="text-xs text-ink/50">
                            Actions are disabled while previewing as a customer.
                          </p>
                        ) : (
                          <BookOrCancelButtons requestType="reservation" requestId={r.id} />
                        )}
                      </div>
                    )}
                    {r.status === "confirmed" && projectId && (
                      <Link
                        href={`/dashboard/projects/${projectId}`}
                        className="mt-3 inline-block text-sm font-semibold text-wine underline decoration-line underline-offset-4 hover:text-wine-dark"
                      >
                        View project →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Custom package requests
          </h2>
          {!customRequests || customRequests.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No custom requests yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {customRequests.map((r) => {
                const summary = summaries.get(`custom:${r.id}`);
                const line = confirmationLine(summary);
                const bookable = r.status === "pending" && summary?.status === "ready_for_customer";
                const projectId = projectIdByRequest.get(`custom:${r.id}`);
                return (
                  <li key={r.id} className="rounded-card border border-line bg-white p-4">
                    <p className="font-semibold text-ink">
                      {REGION_LABEL[r.base_region] ?? r.base_region}
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                      {r.travel_month ?? "date not specified"}
                      {r.group_size ? ` · group of ${r.group_size}` : ""}
                      {r.single_room ? " · single room" : ""}
                      {" · "}
                      {STATUS_LABEL[r.status] ?? r.status}
                    </p>
                    {r.status === "pending" && line && (
                      <p className="mt-2 text-sm text-ink/80">{line}</p>
                    )}
                    {bookable && (
                      <div className="mt-3">
                        {viewingAs ? (
                          <p className="text-xs text-ink/50">
                            Actions are disabled while previewing as a customer.
                          </p>
                        ) : (
                          <BookOrCancelButtons requestType="custom" requestId={r.id} />
                        )}
                      </div>
                    )}
                    {r.status === "confirmed" && projectId && (
                      <Link
                        href={`/dashboard/projects/${projectId}`}
                        className="mt-3 inline-block text-sm font-semibold text-wine underline decoration-line underline-offset-4 hover:text-wine-dark"
                      >
                        View project →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
