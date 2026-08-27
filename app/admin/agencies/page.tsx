import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const COUNTRY_LABEL: Record<string, string> = {
  NO: "Norway",
  SE: "Sweden",
  DK: "Denmark",
};

export default async function AdminAgenciesPage() {
  const supabase = await createClient();

  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name, country, contact_email, mobile_phone, city, created_at")
    .order("name");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("agency_id, full_name")
    .not("agency_id", "is", null);

  const { data: reservations } = await supabase.from("reservation_requests").select("agency_id");
  const { data: customRequests } = await supabase.from("custom_package_requests").select("agency_id");

  const contactsByAgency = new Map<string, string[]>();
  for (const p of profiles ?? []) {
    if (!p.agency_id) continue;
    const list = contactsByAgency.get(p.agency_id) ?? [];
    if (p.full_name) list.push(p.full_name);
    contactsByAgency.set(p.agency_id, list);
  }

  const countByAgency = (rows: { agency_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) {
      map.set(r.agency_id, (map.get(r.agency_id) ?? 0) + 1);
    }
    return map;
  };
  const reservationCounts = countByAgency(reservations);
  const customCounts = countByAgency(customRequests);

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Customers</h1>
      <p className="mt-1 text-ink/60">
        Travel agencies registered on the platform.
      </p>

      {!agencies || agencies.length === 0 ? (
        <p className="mt-8 text-ink/60">No agencies registered yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {agencies.map((a) => {
            const contacts = contactsByAgency.get(a.id) ?? [];
            const reservationCount = reservationCounts.get(a.id) ?? 0;
            const customCount = customCounts.get(a.id) ?? 0;

            return (
              <article key={a.id} className="rounded-card border border-line bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                  {a.country ? COUNTRY_LABEL[a.country] ?? a.country : "Country not set"}
                  {a.city ? ` · ${a.city}` : ""}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{a.name}</h3>
                <p className="mt-1 text-sm text-ink/60">
                  {a.contact_email}
                  {a.mobile_phone ? ` · ${a.mobile_phone}` : ""}
                </p>
                {contacts.length > 0 && (
                  <p className="mt-1 text-sm text-ink/60">
                    Contact: {contacts.join(", ")}
                  </p>
                )}
                <p className="mt-2 text-sm text-ink/80">
                  {reservationCount} reservation{reservationCount === 1 ? "" : "s"} ·{" "}
                  {customCount} custom request{customCount === 1 ? "" : "s"}
                </p>

                <div className="mt-5">
                  <Link
                    href={`/admin/agencies/${a.id}`}
                    className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
                  >
                    View / edit
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
