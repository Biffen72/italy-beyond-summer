import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AgencyProfileForm } from "@/app/dashboard/profile/AgencyProfileForm";
import { getConfirmationSummaries } from "@/lib/confirmations";
import { REGION_LABEL } from "@/lib/regions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Booked",
  declined: "Declined",
  cancelled: "Cancelled",
  contacted: "Contacted",
  closed: "Closed",
};

export default async function AdminAgencyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agencyId } = await params;
  const supabase = await createClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select(
      "name, address, city, country, mobile_phone, contact_email, billing_address, electronic_invoice_address, logo_url"
    )
    .eq("id", agencyId)
    .maybeSingle();

  if (!agency) {
    notFound();
  }

  const { data: reservations } = await supabase
    .from("reservation_requests")
    .select("id, travel_month, group_size, status, created_at, packages(title)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  const { data: customRequests } = await supabase
    .from("custom_package_requests")
    .select("id, base_region, travel_month, group_size, status, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  const summaries = await getConfirmationSummaries(supabase, [
    ...(reservations ?? []).map((r) => ({ requestType: "reservation" as const, requestId: r.id })),
    ...(customRequests ?? []).map((r) => ({ requestType: "custom" as const, requestId: r.id })),
  ]);

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">{agency.name}</h1>
      <p className="mt-1 max-w-xl text-ink/60">
        Editing this customer&apos;s profile on their behalf.
      </p>

      <div className="mt-8 max-w-xl">
        <AgencyProfileForm
          agencyId={agencyId}
          initial={{
            name: agency.name ?? "",
            address: agency.address ?? "",
            city: agency.city ?? "",
            country: (agency.country as "NO" | "SE" | "DK" | null) ?? "",
            mobilePhone: agency.mobile_phone ?? "",
            contactEmail: agency.contact_email ?? "",
            billingAddress: agency.billing_address ?? "",
            electronicInvoiceAddress: agency.electronic_invoice_address ?? "",
            logoUrl: agency.logo_url ?? null,
          }}
        />
      </div>

      <div className="mt-10 max-w-xl space-y-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Package reservations
          </h2>
          {!reservations || reservations.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No reservation requests yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {reservations.map((r) => {
                const pkg = r.packages as unknown as { title: string } | null;
                const summary = summaries.get(`reservation:${r.id}`);
                return (
                  <li
                    key={r.id}
                    className="rounded-card border border-line bg-white px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-ink">{pkg?.title ?? "Package"}</span>
                    <span className="text-ink/60">
                      {" "}
                      · {r.travel_month}
                      {r.group_size ? ` · group of ${r.group_size}` : ""} ·{" "}
                      {STATUS_LABEL[r.status] ?? r.status}
                      {summary && summary.total > 0 && r.status === "pending"
                        ? ` · ${summary.yesCount}/${summary.total} suppliers confirmed`
                        : ""}
                    </span>
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
            <ul className="mt-3 space-y-2">
              {customRequests.map((r) => {
                const summary = summaries.get(`custom:${r.id}`);
                return (
                  <li
                    key={r.id}
                    className="rounded-card border border-line bg-white px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-ink">
                      {REGION_LABEL[r.base_region] ?? r.base_region}
                    </span>
                    <span className="text-ink/60">
                      {" "}
                      · {r.travel_month ?? "date not specified"}
                      {r.group_size ? ` · group of ${r.group_size}` : ""} ·{" "}
                      {STATUS_LABEL[r.status] ?? r.status}
                      {summary && summary.total > 0 && r.status === "pending"
                        ? ` · ${summary.yesCount}/${summary.total} suppliers confirmed`
                        : ""}
                    </span>
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
