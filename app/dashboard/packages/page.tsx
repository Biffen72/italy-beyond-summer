import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { RequestButton } from "../RequestButton";
import { PACKAGE_TYPE_LABEL, type PackageType } from "@/lib/packageTypes";
import { getPackageDisplayPrice } from "@/lib/pricing";
import { resolveAgencyId } from "@/lib/viewAs";

export default async function PackageCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const { theme } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  let query = supabase
    .from("packages")
    .select("id, title, package_type, nights, base_region, price_eur, description")
    .eq("active", true)
    .order("price_eur", { ascending: true });

  if (theme) {
    query = query.eq("package_type", theme as PackageType);
  }

  const { data: packages } = await query;

  const packagesWithPrice = await Promise.all(
    (packages ?? []).map(async (pkg) => ({
      ...pkg,
      displayPrice: await getPackageDisplayPrice(supabase, pkg, agencyCountry),
    }))
  );

  const themeLabel = theme ? PACKAGE_TYPE_LABEL[theme] ?? theme : null;

  return (
    <section className="px-6 py-10 md:px-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-wine underline decoration-line underline-offset-4 hover:text-wine-dark"
          >
            ← All themes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            {themeLabel ? `${themeLabel} packages` : "All packages"}
          </h1>
          <p className="mt-1 text-ink/60">
            Ready-to-sell 7-night packages your agency can start marketing
            today.
          </p>
        </div>
        <Link
          href="/dashboard/build"
          className="whitespace-nowrap rounded-card border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-wine"
        >
          Build your own package
        </Link>
      </div>

      {packagesWithPrice.length === 0 ? (
        <p className="mt-8 text-ink/60">
          No packages published for this theme yet — check back soon.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packagesWithPrice.map((pkg) => (
            <article
              key={pkg.id}
              className="rounded-card border border-line bg-white p-5"
            >
              <Link href={`/dashboard/packages/${pkg.id}`} className="block">
                <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                  {PACKAGE_TYPE_LABEL[pkg.package_type] ?? pkg.package_type} ·{" "}
                  {pkg.nights} nights
                </p>
                <h2 className="mt-2 text-lg font-semibold text-ink transition hover:text-wine">
                  {pkg.title}
                </h2>
                <p className="mt-1 text-sm text-ink/60">{pkg.description}</p>
                <p className="mt-4 font-display text-2xl font-semibold text-ink">
                  {pkg.displayPrice}
                  <span className="ml-1 text-sm font-normal text-ink/50">
                    / person
                  </span>
                </p>
              </Link>
              <RequestButton packageId={pkg.id} readOnly={!!viewingAs} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
