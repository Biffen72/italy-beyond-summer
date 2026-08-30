import { createClient } from "@/lib/supabase/server";
import { getConfirmationSummaries } from "@/lib/confirmations";
import { daysAgoLabel, daysSince, STALE_REQUEST_DAYS } from "@/lib/dateAge";
import { setReservationStatus, setInvoiceStatus } from "./actions";

const INVOICE_LABEL: Record<string, string> = {
  not_invoiced: "Not invoiced",
  invoiced: "Invoiced",
  paid: "Paid",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export default async function AdminReservationsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("reservation_requests")
    .select(
      "id, travel_month, group_size, single_room, status, created_at, invoice_status, agencies(name), packages(title)"
    )
    .order("created_at", { ascending: false });

  const summaries = await getConfirmationSummaries(
    supabase,
    (requests ?? []).map((r) => ({ requestType: "reservation" as const, requestId: r.id }))
  );

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Reservations</h1>
      <p className="mt-1 text-ink/60">
        Reservation requests from agencies.
      </p>

      {!requests || requests.length === 0 ? (
        <p className="mt-8 text-ink/60">No requests yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Travel month</th>
                <th className="px-4 py-3">Group size</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Suppliers</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const agency = r.agencies as unknown as { name: string } | null;
                const pkg = r.packages as unknown as { title: string } | null;
                const summary = summaries.get(`reservation:${r.id}`);

                return (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{agency?.name ?? "—"}</td>
                    <td className="px-4 py-3">{pkg?.title ?? "—"}</td>
                    <td className="px-4 py-3">{r.travel_month}</td>
                    <td className="px-4 py-3">{r.group_size}</td>
                    <td className="px-4 py-3">{r.single_room ? "Single" : "Standard"}</td>
                    <td className="px-4 py-3 text-xs">
                      {!summary || summary.total === 0
                        ? "—"
                        : summary.status === "ready_for_customer"
                          ? "All confirmed"
                          : summary.status === "declined_by_supplier"
                            ? "One or more said no"
                            : `${summary.yesCount}/${summary.total} confirmed`}
                    </td>
                    <td className="px-4 py-3">{STATUS_LABEL[r.status] ?? r.status}</td>
                    <td
                      className={`px-4 py-3 ${
                        r.status === "pending" && daysSince(r.created_at) >= STALE_REQUEST_DAYS
                          ? "font-semibold text-wine"
                          : "text-ink/60"
                      }`}
                    >
                      {daysAgoLabel(r.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "confirmed" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink/70">
                            {INVOICE_LABEL[r.invoice_status] ?? r.invoice_status}
                          </span>
                          {r.invoice_status === "not_invoiced" && (
                            <form action={setInvoiceStatus.bind(null, r.id, "invoiced")}>
                              <button
                                type="submit"
                                className="rounded-card border border-line px-2 py-1 text-xs font-semibold text-ink transition hover:border-wine"
                              >
                                Mark invoiced
                              </button>
                            </form>
                          )}
                          {r.invoice_status === "invoiced" && (
                            <form action={setInvoiceStatus.bind(null, r.id, "paid")}>
                              <button
                                type="submit"
                                className="rounded-card border border-line px-2 py-1 text-xs font-semibold text-ink transition hover:border-wine"
                              >
                                Mark paid
                              </button>
                            </form>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-ink/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <form action={setReservationStatus.bind(null, r.id, "confirmed")}>
                            <button
                              type="submit"
                              className="rounded-card bg-wine px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-wine-dark"
                            >
                              Confirm
                            </button>
                          </form>
                          <form action={setReservationStatus.bind(null, r.id, "declined")}>
                            <button
                              type="submit"
                              className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-wine"
                            >
                              Decline
                            </button>
                          </form>
                        </div>
                      )}
                      {r.status === "confirmed" && (
                        <form action={setReservationStatus.bind(null, r.id, "cancelled")}>
                          <button
                            type="submit"
                            className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-wine"
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
