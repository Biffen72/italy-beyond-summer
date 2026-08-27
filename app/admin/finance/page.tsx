import { createClient } from "@/lib/supabase/server";

function startOfWeek(now: Date) {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatEur(n: number) {
  return `€${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default async function AdminFinancePage() {
  const supabase = await createClient();

  const { data: reservations } = await supabase
    .from("reservation_requests")
    .select("price_eur_snapshot, supplier_cost_eur_snapshot, created_at, status")
    .eq("status", "confirmed");

  const rows = reservations ?? [];
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  let totalSales = 0;
  let salesThisMonth = 0;
  let salesThisWeek = 0;
  let totalProfit = 0;

  for (const r of rows) {
    const price = Number(r.price_eur_snapshot ?? 0);
    const cost = r.supplier_cost_eur_snapshot != null ? Number(r.supplier_cost_eur_snapshot) : 0;
    const created = new Date(r.created_at);

    totalSales += price;
    totalProfit += price - cost;
    if (created >= monthStart) salesThisMonth += price;
    if (created >= weekStart) salesThisWeek += price;
  }

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Finance</h1>
      <p className="mt-1 max-w-2xl text-ink/60">
        Based on confirmed reservations. Figures are shown in EUR (the
        platform's internal base currency) regardless of what the agency
        was charged in — profit for packages without linked suppliers
        (no cost data) counts the full price as profit, since there's no
        supplier-cost breakdown to subtract.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Total sales
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {formatEur(totalSales)}
          </p>
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Sales this month
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {formatEur(salesThisMonth)}
          </p>
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Sales this week
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {formatEur(salesThisWeek)}
          </p>
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Total profit
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-wine">
            {formatEur(totalProfit)}
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="mt-8 text-ink/60">
          No confirmed reservations yet — figures will appear here once
          some come in.
        </p>
      )}
    </section>
  );
}
