import { createClient } from "@/lib/supabase/server";
import { computePackageTotalEur } from "@/lib/pricing";
import { getConfirmationSummaries } from "@/lib/confirmations";
import { daysAgoLabel, daysSince, STALE_REQUEST_DAYS } from "@/lib/dateAge";
import { REGION_LABEL } from "@/lib/regions";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";
import { setCustomRequestStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  contacted: "Contacted",
  closed: "Closed",
};

export default async function AdminCustomRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("custom_package_requests")
    .select(
      "id, base_region, nights, group_size, single_room, travel_month, status, created_at, agencies(name)"
    )
    .order("created_at", { ascending: false });

  const rows = await Promise.all(
    (requests ?? []).map(async (r) => {
      const { data: links } = await supabase
        .from("custom_package_request_suppliers")
        .select("supplier_id")
        .eq("request_id", r.id);
      const supplierIds = (links ?? []).map((l) => l.supplier_id as string);

      const { data: suppliers } =
        supplierIds.length > 0
          ? await supabase
              .from("suppliers")
              .select("id, name, category, star_rating, quality_rating")
              .in("id", supplierIds)
          : { data: [] };

      const { eur, missingPriceCount } = await computePackageTotalEur(
        supabase,
        supplierIds,
        r.nights,
        r.single_room
      );

      return {
        ...r,
        agency: r.agencies as unknown as { name: string } | null,
        suppliers: suppliers ?? [],
        suggestedTotalEur: eur * 1.1,
        missingPriceCount,
      };
    })
  );

  const summaries = await getConfirmationSummaries(
    supabase,
    rows.map((r) => ({ requestType: "custom" as const, requestId: r.id }))
  );

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Custom package requests</h1>
      <p className="mt-1 text-ink/60">
        Build-your-own submissions from agencies. Follow up with a quote.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-ink/60">No custom requests yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {rows.map((r) => (
            <article key={r.id} className="rounded-card border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                {r.agency?.name ?? "Unknown agency"} · {REGION_LABEL[r.base_region] ?? r.base_region}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                {r.nights} nights{r.group_size ? ` · group of ${r.group_size}` : ""}
                {r.single_room ? " · single room" : ""}
              </h2>
              <p className="mt-1 text-sm text-ink/60">
                {r.travel_month ?? "Date not specified"}
              </p>
              <p className="mt-2 text-sm text-ink/60">
                Suggested total: €
                {r.suggestedTotalEur.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                {r.missingPriceCount > 0 ? ` (${r.missingPriceCount} unpriced)` : ""}
              </p>
              {(() => {
                const summary = summaries.get(`custom:${r.id}`);
                if (!summary || summary.total === 0) return null;
                const text =
                  summary.status === "ready_for_customer"
                    ? "All suppliers confirmed"
                    : summary.status === "declined_by_supplier"
                      ? "One or more suppliers said no"
                      : `${summary.yesCount}/${summary.total} suppliers confirmed`;
                return <p className="mt-1 text-xs text-ink/60">{text}</p>;
              })()}

              {r.suppliers.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-ink/80">
                  {r.suppliers.map((s) => (
                    <li key={s.id}>
                      {s.name}
                      <SupplierRatingBadge
                        category={s.category}
                        starRating={s.star_rating}
                        qualityRating={s.quality_rating}
                      />{" "}
                      <span className="text-xs text-ink/50">({s.category})</span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-sm text-ink/80">
                Status: {STATUS_LABEL[r.status] ?? r.status}
                {" · "}
                <span
                  className={
                    r.status === "pending" && daysSince(r.created_at) >= STALE_REQUEST_DAYS
                      ? "font-semibold text-wine"
                      : "text-ink/60"
                  }
                >
                  {daysAgoLabel(r.created_at)}
                </span>
              </p>

              <div className="mt-4 flex gap-3">
                {r.status === "pending" && (
                  <form action={setCustomRequestStatus.bind(null, r.id, "contacted")}>
                    <button
                      type="submit"
                      className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark"
                    >
                      Mark contacted
                    </button>
                  </form>
                )}
                {r.status !== "closed" && (
                  <form action={setCustomRequestStatus.bind(null, r.id, "closed")}>
                    <button
                      type="submit"
                      className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
                    >
                      Close
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
