import { createClient } from "@/lib/supabase/server";
import { CreatePackageForm } from "./CreatePackageForm";
import { PackageRow } from "./PackageRow";

export default async function AdminPackagesPage() {
  const supabase = await createClient();

  const { data: packages } = await supabase
    .from("packages")
    .select("id, title, package_type, nights, base_region, price_eur, description, active")
    .order("price_eur", { ascending: true });

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, category, base_region, logo_url, star_rating, quality_rating")
    .eq("status", "active")
    .order("name");

  const { data: packageTypes } = await supabase
    .from("categories")
    .select("value, label")
    .eq("kind", "package")
    .order("sort_order");

  const { data: links } = await supabase
    .from("package_suppliers")
    .select("package_id, supplier_id");

  const linksByPackage = new Map<string, string[]>();
  (links ?? []).forEach((l) => {
    const list = linksByPackage.get(l.package_id) ?? [];
    list.push(l.supplier_id);
    linksByPackage.set(l.package_id, list);
  });

  const { data: itineraryDays } = await supabase
    .from("package_itinerary_days")
    .select("package_id, day_number, title, description")
    .order("day_number");

  const itineraryByPackage = new Map<
    string,
    { dayNumber: number; title: string; description: string }[]
  >();
  (itineraryDays ?? []).forEach((d) => {
    const list = itineraryByPackage.get(d.package_id) ?? [];
    list.push({ dayNumber: d.day_number, title: d.title, description: d.description ?? "" });
    itineraryByPackage.set(d.package_id, list);
  });

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Packages</h1>
      <p className="mt-1 text-ink/60">
        Packages here show up directly in the agency catalog.
      </p>

      <div className="mt-8 max-w-4xl">
        <CreatePackageForm suppliers={suppliers ?? []} packageTypes={packageTypes ?? []} />
      </div>

      {!packages || packages.length === 0 ? (
        <p className="mt-8 text-ink/60">No packages created yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
          {packages.map((pkg) => (
            <PackageRow
              key={pkg.id}
              pkg={pkg}
              suppliers={suppliers ?? []}
              packageTypes={packageTypes ?? []}
              initialSupplierIds={linksByPackage.get(pkg.id) ?? []}
              initialItinerary={itineraryByPackage.get(pkg.id) ?? []}
            />
          ))}
        </div>
      )}
    </section>
  );
}
