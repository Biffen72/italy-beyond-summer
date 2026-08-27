import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { setSupplierStatus } from "./actions";
import { groupByCategory } from "@/lib/groupByCategory";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending approval",
  active: "Active",
  inactive: "Inactive",
};

export default async function AdminSuppliersPage() {
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select(
      "id, name, category, base_region, address, price_per_person, status, star_rating, quality_rating"
    )
    .order("name");

  const grouped = groupByCategory(suppliers ?? []);

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Suppliers</h1>
      <p className="mt-1 text-ink/60">
        Approve new suppliers, or deactivate existing ones.
      </p>

      {grouped.length === 0 ? (
        <p className="mt-8 text-ink/60">No suppliers registered yet.</p>
      ) : (
        grouped.map(([category, items]) => (
          <div key={category} className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              {category} <span className="text-ink/40">({items.length})</span>
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {items.map((s) => (
                <article
                  key={s.id}
                  className="rounded-card border border-line bg-white p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                    {s.base_region}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-ink">
                    {s.name}
                    <SupplierRatingBadge
                      category={s.category}
                      starRating={s.star_rating}
                      qualityRating={s.quality_rating}
                    />
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">
                    {s.address}
                    {s.price_per_person != null ? ` · €${s.price_per_person}/person` : ""}
                  </p>
                  <p className="mt-2 text-sm text-ink/80">
                    Status: {STATUS_LABEL[s.status] ?? s.status}
                  </p>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/admin/suppliers/${s.id}`}
                      className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
                    >
                      Edit profile
                    </Link>
                    {s.status === "pending" && (
                      <form action={setSupplierStatus.bind(null, s.id, "active")}>
                        <button
                          type="submit"
                          className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark"
                        >
                          Approve
                        </button>
                      </form>
                    )}
                    {s.status === "active" && (
                      <form action={setSupplierStatus.bind(null, s.id, "inactive")}>
                        <button
                          type="submit"
                          className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
                        >
                          Deactivate
                        </button>
                      </form>
                    )}
                    {s.status === "inactive" && (
                      <form action={setSupplierStatus.bind(null, s.id, "active")}>
                        <button
                          type="submit"
                          className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark"
                        >
                          Activate
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
