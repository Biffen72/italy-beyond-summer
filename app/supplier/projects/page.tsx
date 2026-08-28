import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveSupplierId } from "@/lib/viewAs";
import { ViewAsBanner } from "@/components/ViewAsBanner";

export default async function SupplierProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { supplierId, viewingAs } = await resolveSupplierId(supabase, user.id);
  if (!supplierId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6">
        <p className="max-w-sm text-center text-ink/70">
          Your account isn&apos;t linked to a supplier profile yet.
        </p>
      </main>
    );
  }

  // Explicit app-level filter (not just RLS) so admin's "view as supplier"
  // preview shows only what that specific supplier can see — RLS alone
  // would let it through anyway via the separate admin-role policy.
  const { data: confirmations } = await supabase
    .from("booking_supplier_confirmations")
    .select("request_type, request_id")
    .eq("supplier_id", supplierId);

  const requestTypes = [...new Set((confirmations ?? []).map((c) => c.request_type))];

  let projects: { id: string; name: string; start_date: string | null; end_date: string | null; group_size: number | null }[] = [];
  if (requestTypes.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, start_date, end_date, group_size, request_type, request_id")
      .eq("status", "submitted")
      .in("request_type", requestTypes)
      .order("start_date");

    const confirmedKeys = new Set(
      (confirmations ?? []).map((c) => `${c.request_type}:${c.request_id}`)
    );
    projects = (data ?? []).filter((p) => confirmedKeys.has(`${p.request_type}:${p.request_id}`));
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5 md:px-12">
        <Link href="/supplier" className="font-display text-lg font-semibold text-ink">
          Italy Beyond Summer
        </Link>
        <p className="text-sm text-ink/60">Upcoming projects</p>
      </header>
      {viewingAs && <ViewAsBanner label={viewingAs.label} type="supplier" />}

      <section className="px-6 py-10 md:px-12">
        <h1 className="text-2xl font-semibold text-ink">Upcoming projects</h1>
        <p className="mt-1 text-ink/60">
          Bookings you&apos;re confirmed on, with the room list or program
          details relevant to you.
        </p>

        {!projects || projects.length === 0 ? (
          <p className="mt-8 text-ink/60">Nothing upcoming yet.</p>
        ) : (
          <ul className="mt-8 max-w-xl space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/supplier/projects/${p.id}`}
                  className="block rounded-card border border-line bg-white p-4 transition hover:border-wine"
                >
                  <p className="font-semibold text-ink">{p.name}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {p.start_date ?? "no start date"} – {p.end_date ?? "no end date"}
                    {p.group_size ? ` · group of ${p.group_size}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
