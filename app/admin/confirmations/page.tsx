import { createClient } from "@/lib/supabase/server";
import { REGION_LABEL } from "@/lib/regions";
import { isOverdue } from "@/lib/confirmations";
import { SuggestAlternativeForm } from "./SuggestAlternativeForm";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  yes: "Confirmed",
  no: "Declined",
};

export default async function AdminConfirmationsPage() {
  const supabase = await createClient();

  const { data: allConfirmations } = await supabase
    .from("booking_supplier_confirmations")
    .select("id, request_type, request_id, supplier_id, status, response_deadline, is_alternative_for, created_at")
    .order("created_at", { ascending: false });

  const rows = allConfirmations ?? [];
  const supersededIds = new Set(
    rows.filter((r) => r.is_alternative_for).map((r) => r.is_alternative_for as string)
  );
  const activeRows = rows.filter((r) => !supersededIds.has(r.id));

  const reservationIds = [...new Set(activeRows.filter((r) => r.request_type === "reservation").map((r) => r.request_id))];
  const customIds = [...new Set(activeRows.filter((r) => r.request_type === "custom").map((r) => r.request_id))];

  const [{ data: reservations }, { data: customRequests }, { data: suppliers }] = await Promise.all([
    reservationIds.length > 0
      ? supabase
          .from("reservation_requests")
          .select("id, status, package_id, agencies(name), packages(title)")
          .in("id", reservationIds)
      : Promise.resolve({ data: [] as never[] }),
    customIds.length > 0
      ? supabase
          .from("custom_package_requests")
          .select("id, status, base_region, agencies(name)")
          .in("id", customIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("suppliers").select("id, name, category, base_region, status"),
  ]);

  const reservationsById = new Map((reservations ?? []).map((r) => [r.id, r]));
  const customById = new Map((customRequests ?? []).map((r) => [r.id, r]));
  const suppliersById = new Map((suppliers ?? []).map((s) => [s.id, s]));

  const [{ data: packageLinks }, { data: customLinks }] = await Promise.all([
    reservationIds.length > 0
      ? supabase
          .from("package_suppliers")
          .select("package_id, supplier_id")
          .in(
            "package_id",
            [...new Set((reservations ?? []).map((r) => r.package_id).filter(Boolean))] as string[]
          )
      : Promise.resolve({ data: [] as { package_id: string; supplier_id: string }[] }),
    customIds.length > 0
      ? supabase
          .from("custom_package_request_suppliers")
          .select("request_id, supplier_id")
          .in("request_id", customIds)
      : Promise.resolve({ data: [] as { request_id: string; supplier_id: string }[] }),
  ]);

  const linkedByPackage = new Map<string, Set<string>>();
  (packageLinks ?? []).forEach((l) => {
    const set = linkedByPackage.get(l.package_id) ?? new Set<string>();
    set.add(l.supplier_id);
    linkedByPackage.set(l.package_id, set);
  });
  const linkedByCustomRequest = new Map<string, Set<string>>();
  (customLinks ?? []).forEach((l) => {
    const set = linkedByCustomRequest.get(l.request_id) ?? new Set<string>();
    set.add(l.supplier_id);
    linkedByCustomRequest.set(l.request_id, set);
  });

  type Row = {
    id: string;
    supplierName: string;
    parentLabel: string;
    agencyName: string;
    status: string;
    overdue: boolean;
    deadlineLabel: string | null;
    candidates: { id: string; name: string }[];
  };

  const displayRows: Row[] = [];

  for (const row of activeRows) {
    const supplier = suppliersById.get(row.supplier_id);
    if (!supplier) continue;

    let parentStatus: string;
    let agencyName: string;
    let parentLabel: string;
    let excludeIds: Set<string>;

    if (row.request_type === "reservation") {
      const r = reservationsById.get(row.request_id);
      if (!r) continue;
      parentStatus = r.status;
      const agency = r.agencies as unknown as { name: string } | null;
      const pkg = r.packages as unknown as { title: string } | null;
      agencyName = agency?.name ?? "Unknown agency";
      parentLabel = pkg?.title ?? "Package reservation";
      excludeIds = linkedByPackage.get(r.package_id) ?? new Set();
    } else {
      const r = customById.get(row.request_id);
      if (!r) continue;
      parentStatus = r.status;
      const agency = r.agencies as unknown as { name: string } | null;
      agencyName = agency?.name ?? "Unknown agency";
      parentLabel = `Custom trip — ${REGION_LABEL[r.base_region] ?? r.base_region}`;
      excludeIds = linkedByCustomRequest.get(r.id) ?? new Set();
    }

    // Only surface confirmations for bookings that are still undecided —
    // once the agency has booked or cancelled, this list doesn't need it.
    if (parentStatus !== "pending") continue;

    const candidates =
      row.status === "no"
        ? (suppliers ?? [])
            .filter(
              (s) =>
                s.category === supplier.category &&
                s.base_region === supplier.base_region &&
                s.status === "active" &&
                s.id !== supplier.id &&
                !excludeIds.has(s.id)
            )
            .map((s) => ({ id: s.id, name: s.name }))
        : [];

    displayRows.push({
      id: row.id,
      supplierName: `${supplier.name} (${supplier.category}, ${REGION_LABEL[supplier.base_region] ?? supplier.base_region})`,
      parentLabel,
      agencyName,
      status: row.status,
      overdue: isOverdue(row),
      deadlineLabel: row.response_deadline
        ? new Date(row.response_deadline).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      candidates,
    });
  }

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Supplier confirmations</h1>
      <p className="mt-1 text-ink/60">
        Every supplier confirmation for a booking that&apos;s still pending —
        overdue ones and declines needing an alternative are highlighted.
      </p>

      {displayRows.length === 0 ? (
        <p className="mt-8 text-ink/60">Nothing pending right now.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink/50">
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Booking</th>
                <th className="py-2 pr-4">Agency</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Deadline</th>
                <th className="py-2">Alternative</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => (
                <tr key={row.id} className="border-b border-line align-top">
                  <td className="py-3 pr-4 text-ink">{row.supplierName}</td>
                  <td className="py-3 pr-4 text-ink/80">{row.parentLabel}</td>
                  <td className="py-3 pr-4 text-ink/80">{row.agencyName}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        row.status === "no"
                          ? "font-semibold text-wine"
                          : row.status === "yes"
                            ? "text-olive"
                            : "text-ink/70"
                      }
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className={`py-3 pr-4 ${row.overdue ? "font-semibold text-wine" : "text-ink/60"}`}>
                    {row.overdue ? "Overdue" : (row.deadlineLabel ?? "—")}
                  </td>
                  <td className="py-3">
                    {row.status === "no" ? (
                      <SuggestAlternativeForm confirmationId={row.id} candidates={row.candidates} />
                    ) : (
                      <span className="text-xs text-ink/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
