import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RequestButton } from "../../RequestButton";
import { categoryLabelMap } from "@/lib/categories";
import { getPackageDisplayPrice } from "@/lib/pricing";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";
import { resolveAgencyId } from "@/lib/viewAs";

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pkg } = await supabase
    .from("packages")
    .select("id, title, package_type, nights, base_region, price_eur, description")
    .eq("id", id)
    .maybeSingle();

  if (!pkg) {
    notFound();
  }

  const { agencyId, viewingAs } = await resolveAgencyId(supabase, user!.id);

  let agencyCountry: string | null = null;
  if (agencyId) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("country")
      .eq("id", agencyId)
      .single();
    agencyCountry = agency?.country ?? null;
  }

  const displayPrice = await getPackageDisplayPrice(supabase, pkg, agencyCountry);

  const { data: packageCategories } = await supabase
    .from("categories")
    .select("value, label")
    .eq("kind", "package");
  const labelMap = categoryLabelMap(packageCategories ?? []);

  const { data: itineraryDays } = await supabase
    .from("package_itinerary_days")
    .select("day_number, title, description")
    .eq("package_id", id)
    .order("day_number");

  const { data: links } = await supabase
    .from("package_suppliers")
    .select("supplier_id, sort_order")
    .eq("package_id", id)
    .order("sort_order");

  const supplierIds = (links ?? []).map((l) => l.supplier_id);

  const { data: suppliers } =
    supplierIds.length > 0
      ? await supabase
          .from("suppliers")
          .select("id, name, category, base_region, logo_url, star_rating, quality_rating")
          .in("id", supplierIds)
          .eq("status", "active")
      : { data: [] };

  return (
    <section className="px-6 py-10 md:px-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-wine">
        {labelMap[pkg.package_type] ?? pkg.package_type} · {pkg.nights} nights ·{" "}
        {pkg.base_region}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">{pkg.title}</h1>
      <p className="mt-3 max-w-2xl text-ink/80">{pkg.description}</p>
      <p className="mt-4 font-display text-2xl font-semibold text-ink">
        {displayPrice}
        <span className="ml-1 text-sm font-normal text-ink/50">/ person</span>
      </p>

      <div className="mt-4 max-w-xs">
        <RequestButton packageId={pkg.id} readOnly={!!viewingAs} />
      </div>

      {itineraryDays && itineraryDays.length > 0 && (
        <div className="mt-10 max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Day-by-day
          </h2>
          <ol className="mt-4 space-y-4">
            {itineraryDays.map((day) => (
              <li key={day.day_number} className="rounded-card border border-line bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                  Day {day.day_number}
                </p>
                <p className="mt-1 font-semibold text-ink">{day.title}</p>
                {day.description && (
                  <p className="mt-1 text-sm text-ink/70">{day.description}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-10 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          What&apos;s included
        </h2>

        {!suppliers || suppliers.length === 0 ? (
          <p className="mt-3 text-ink/60">
            Activity details for this package aren&apos;t published yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {suppliers.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/suppliers/${s.id}`}
                className="block rounded-card border border-line bg-white p-4 transition hover:border-wine"
              >
                {s.logo_url && (
                  <img
                    src={s.logo_url}
                    alt=""
                    className="h-10 w-10 rounded-card border border-line object-cover"
                  />
                )}
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-wine">
                  {s.category}
                </p>
                <p className="mt-1 font-semibold text-ink">
                  {s.name}
                  <SupplierRatingBadge
                    category={s.category}
                    starRating={s.star_rating}
                    qualityRating={s.quality_rating}
                  />
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
