import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { RequestButton } from "./RequestButton";
import { PACKAGE_TYPE_LABEL } from "@/lib/packageTypes";
import { getPackageDisplayPrice } from "@/lib/pricing";
import { resolveAgencyId } from "@/lib/viewAs";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { agencyId, viewingAs } = await resolveAgencyId(supabase, user!.id);

  let profileIncomplete = false;
  let agencyCountry: string | null = null;
  if (agencyId) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("address, city, country, mobile_phone")
      .eq("id", agencyId)
      .single();
    profileIncomplete =
      !agency?.address || !agency?.city || !agency?.country || !agency?.mobile_phone;
    agencyCountry = agency?.country ?? null;
  }

  const { data: packages } = await supabase
    .from("packages")
    .select("id, title, package_type, nights, base_region, price_eur, description")
    .order("price_eur", { ascending: true });

  const packagesWithPrice = await Promise.all(
    (packages ?? []).map(async (pkg) => ({
      ...pkg,
      displayPrice: await getPackageDisplayPrice(supabase, pkg, agencyCountry),
    }))
  );

  return (
    <section className="px-6 py-10 md:px-12">
      {profileIncomplete && (
        <div className="mb-8 flex items-center justify-between rounded-card border border-line bg-white px-5 py-4">
          <p className="text-sm text-ink/70">
            Your customer profile is incomplete — company details help us
            serve you better.
          </p>
          <Link
            href="/dashboard/profile"
            className="whitespace-nowrap text-sm font-semibold text-wine underline decoration-line underline-offset-4 hover:text-wine-dark"
          >
            Complete profile
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Package catalog</h1>
          <p className="mt-1 text-ink/60">
            Ready-to-sell packages your agency can start marketing today.
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
          No packages are published yet — check back soon.
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
