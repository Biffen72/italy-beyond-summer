import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { groupByCategory } from "@/lib/groupByCategory";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";

export default async function SupplierDirectoryPage() {
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, category, base_region, logo_url, star_rating, quality_rating")
    .eq("status", "active")
    .order("name");

  const grouped = groupByCategory(suppliers ?? []);

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Supplier network</h1>
      <p className="mt-1 text-ink/60">
        Browse our curated Calabrian suppliers. Contact us for pricing and
        availability.
      </p>

      {grouped.length === 0 ? (
        <p className="mt-8 text-ink/60">No suppliers are published yet.</p>
      ) : (
        grouped.map(([category, items]) => (
          <div key={category} className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              {category}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/suppliers/${s.id}`}
                  className="block rounded-card border border-line bg-white p-5 transition hover:border-wine"
                >
                  {s.logo_url && (
                    <img
                      src={s.logo_url}
                      alt=""
                      className="h-12 w-12 rounded-card border border-line object-cover"
                    />
                  )}
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-wine">
                    {s.base_region}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">
                    {s.name}
                    <SupplierRatingBadge
                      category={s.category}
                      starRating={s.star_rating}
                      qualityRating={s.quality_rating}
                    />
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
