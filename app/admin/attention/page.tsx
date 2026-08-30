import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConfirmationSummaries, isOverdue } from "@/lib/confirmations";
import { daysAgoLabel, daysSince, STALE_REQUEST_DAYS } from "@/lib/dateAge";
import { REGION_LABEL } from "@/lib/regions";

export default async function AdminAttentionPage() {
  const supabase = await createClient();

  const [{ data: reservations }, { data: customRequests }] = await Promise.all([
    supabase
      .from("reservation_requests")
      .select("id, status, created_at, agencies(name), packages(title)")
      .eq("status", "pending"),
    supabase
      .from("custom_package_requests")
      .select("id, status, created_at, base_region, agencies(name)")
      .eq("status", "pending"),
  ]);

  type PendingRequest = {
    requestType: "reservation" | "custom";
    id: string;
    label: string;
    agencyName: string;
    createdAt: string;
  };

  const pending: PendingRequest[] = [
    ...(reservations ?? []).map((r) => ({
      requestType: "reservation" as const,
      id: r.id,
      label: (r.packages as unknown as { title: string } | null)?.title ?? "Package reservation",
      agencyName: (r.agencies as unknown as { name: string } | null)?.name ?? "Unknown agency",
      createdAt: r.created_at,
    })),
    ...(customRequests ?? []).map((r) => ({
      requestType: "custom" as const,
      id: r.id,
      label: `Custom trip — ${REGION_LABEL[r.base_region] ?? r.base_region}`,
      agencyName: (r.agencies as unknown as { name: string } | null)?.name ?? "Unknown agency",
      createdAt: r.created_at,
    })),
  ];

  const summaries = await getConfirmationSummaries(
    supabase,
    pending.map((r) => ({ requestType: r.requestType, requestId: r.id }))
  );

  const declinedUnresolved = pending.filter(
    (r) => summaries.get(`${r.requestType}:${r.id}`)?.status === "declined_by_supplier"
  );

  const stalePending = pending.filter((r) => {
    const summary = summaries.get(`${r.requestType}:${r.id}`);
    const hasIssue = summary?.status === "declined_by_supplier";
    return !hasIssue && daysSince(r.createdAt) >= STALE_REQUEST_DAYS;
  });

  // Same active-confirmation logic as /admin/confirmations: exclude rows
  // superseded by a proposed alternative, then keep only overdue ones.
  const { data: allConfirmations } = await supabase
    .from("booking_supplier_confirmations")
    .select("id, request_type, request_id, supplier_id, status, response_deadline, is_alternative_for");

  const confirmationRows = allConfirmations ?? [];
  const supersededIds = new Set(
    confirmationRows.filter((r) => r.is_alternative_for).map((r) => r.is_alternative_for as string)
  );
  const overdueRows = confirmationRows.filter(
    (r) => !supersededIds.has(r.id) && isOverdue(r)
  );

  const overdueSupplierIds = [...new Set(overdueRows.map((r) => r.supplier_id))];
  const { data: overdueSuppliers } =
    overdueSupplierIds.length > 0
      ? await supabase.from("suppliers").select("id, name").in("id", overdueSupplierIds)
      : { data: [] };
  const supplierNameById = new Map((overdueSuppliers ?? []).map((s) => [s.id, s.name]));

  const overdueReservationIds = overdueRows
    .filter((r) => r.request_type === "reservation")
    .map((r) => r.request_id);
  const overdueCustomIds = overdueRows
    .filter((r) => r.request_type === "custom")
    .map((r) => r.request_id);

  const [{ data: overdueReservations }, { data: overdueCustomRequests }] = await Promise.all([
    overdueReservationIds.length > 0
      ? supabase
          .from("reservation_requests")
          .select("id, status, packages(title)")
          .in("id", overdueReservationIds)
      : Promise.resolve({ data: [] as { id: string; status: string; packages: unknown }[] }),
    overdueCustomIds.length > 0
      ? supabase
          .from("custom_package_requests")
          .select("id, status, base_region")
          .in("id", overdueCustomIds)
      : Promise.resolve({ data: [] as { id: string; status: string; base_region: string }[] }),
  ]);
  const reservationById = new Map((overdueReservations ?? []).map((r) => [r.id, r]));
  const customById = new Map((overdueCustomRequests ?? []).map((r) => [r.id, r]));

  const overdueConfirmations = overdueRows
    .map((row) => {
      const parent =
        row.request_type === "reservation"
          ? reservationById.get(row.request_id)
          : customById.get(row.request_id);
      if (!parent || parent.status !== "pending") return null;
      const label =
        row.request_type === "reservation"
          ? (parent as { packages: unknown }).packages
            ? ((parent as { packages: unknown }).packages as { title: string }).title
            : "Package reservation"
          : `Custom trip — ${REGION_LABEL[(parent as { base_region: string }).base_region] ?? (parent as { base_region: string }).base_region}`;
      return {
        id: row.id,
        supplierName: supplierNameById.get(row.supplier_id) ?? "Unknown supplier",
        label,
      };
    })
    .filter((r): r is { id: string; supplierName: string; label: string } => !!r);

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Needs attention</h1>
      <p className="mt-1 max-w-2xl text-ink/60">
        Everything in the request/booking flow that's waiting on a human
        decision — a decline with no resolution, a supplier that hasn't
        responded, or a request nobody's touched in a while.
      </p>

      <div className="mt-8 space-y-10">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-wine">
            Declined, not yet resolved ({declinedUnresolved.length})
          </h2>
          {declinedUnresolved.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Nothing here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {declinedUnresolved.map((r) => (
                <li key={`${r.requestType}:${r.id}`}>
                  <Link
                    href="/admin/confirmations"
                    className="block rounded-card border border-line bg-white p-4 transition hover:border-wine"
                  >
                    <p className="font-semibold text-ink">{r.label}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      {r.agencyName} · {daysAgoLabel(r.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-wine">
            Supplier responses overdue ({overdueConfirmations.length})
          </h2>
          {overdueConfirmations.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Nothing here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {overdueConfirmations.map((r) => (
                <li key={r.id}>
                  <Link
                    href="/admin/confirmations"
                    className="block rounded-card border border-line bg-white p-4 transition hover:border-wine"
                  >
                    <p className="font-semibold text-ink">{r.supplierName}</p>
                    <p className="mt-1 text-sm text-ink/60">{r.label}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-wine">
            Stale pending requests ({stalePending.length})
          </h2>
          {stalePending.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Nothing here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stalePending.map((r) => (
                <li key={`${r.requestType}:${r.id}`}>
                  <Link
                    href={r.requestType === "reservation" ? "/admin/reservations" : "/admin/custom-requests"}
                    className="block rounded-card border border-line bg-white p-4 transition hover:border-wine"
                  >
                    <p className="font-semibold text-ink">{r.label}</p>
                    <p className="mt-1 text-sm font-semibold text-wine">
                      {r.agencyName} · {daysAgoLabel(r.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
