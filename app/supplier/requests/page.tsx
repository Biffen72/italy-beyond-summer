import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { REGION_LABEL } from "@/lib/regions";
import { ConfirmButtons } from "./ConfirmButtons";
import { resolveSupplierId } from "@/lib/viewAs";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { isOverdue } from "@/lib/confirmations";

type ConfirmationItem = {
  confirmationId: string;
  requestType: "reservation" | "custom";
  myStatus: "pending" | "yes" | "no";
  parentStatus: string;
  title: string;
  travelMonth: string | null;
  groupSize: number | null;
  singleRoom: boolean;
  agencyName: string;
  responseDeadline: string | null;
};

export default async function SupplierRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { supplierId, viewingAs } = await resolveSupplierId(supabase, user!.id);

  if (!supplierId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6">
        <p className="max-w-sm text-center text-ink/70">
          Your account isn&apos;t linked to a supplier profile yet.
        </p>
      </main>
    );
  }

  const { data: confirmations } = await supabase
    .from("booking_supplier_confirmations")
    .select("id, request_type, request_id, status, response_deadline")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  const rows = confirmations ?? [];
  const reservationIds = rows.filter((r) => r.request_type === "reservation").map((r) => r.request_id);
  const customIds = rows.filter((r) => r.request_type === "custom").map((r) => r.request_id);

  const [{ data: reservations }, { data: customRequests }] = await Promise.all([
    reservationIds.length > 0
      ? supabase
          .from("reservation_requests")
          .select("id, travel_month, group_size, single_room, status, packages(title), agencies(name)")
          .in("id", reservationIds)
      : Promise.resolve({ data: [] as never[] }),
    customIds.length > 0
      ? supabase
          .from("custom_package_requests")
          .select("id, travel_month, group_size, single_room, status, base_region, agencies(name)")
          .in("id", customIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const reservationsById = new Map((reservations ?? []).map((r) => [r.id, r]));
  const customById = new Map((customRequests ?? []).map((r) => [r.id, r]));

  const items: ConfirmationItem[] = rows
    .map((row) => {
      if (row.request_type === "reservation") {
        const r = reservationsById.get(row.request_id);
        if (!r) return null;
        const pkg = r.packages as unknown as { title: string } | null;
        const agency = r.agencies as unknown as { name: string } | null;
        return {
          confirmationId: row.id,
          requestType: "reservation" as const,
          myStatus: row.status as "pending" | "yes" | "no",
          parentStatus: r.status,
          title: pkg?.title ?? "Package reservation",
          travelMonth: r.travel_month,
          groupSize: r.group_size,
          singleRoom: r.single_room,
          agencyName: agency?.name ?? "Unknown agency",
          responseDeadline: row.response_deadline,
        };
      }

      const r = customById.get(row.request_id);
      if (!r) return null;
      const agency = r.agencies as unknown as { name: string } | null;
      return {
        confirmationId: row.id,
        requestType: "custom" as const,
        myStatus: row.status as "pending" | "yes" | "no",
        parentStatus: r.status,
        title: `Custom package — ${REGION_LABEL[r.base_region] ?? r.base_region}`,
        travelMonth: r.travel_month,
        groupSize: r.group_size,
        singleRoom: r.single_room,
        agencyName: agency?.name ?? "Unknown agency",
        responseDeadline: row.response_deadline,
      };
    })
    .filter((item): item is ConfirmationItem => item !== null);

  const awaiting = items.filter((i) => i.myStatus === "pending" && i.parentStatus === "pending");
  const waitingOnOthers = items.filter((i) => i.myStatus !== "pending" && i.parentStatus === "pending");
  const resolved = items.filter((i) => i.parentStatus === "confirmed" || i.parentStatus === "cancelled");

  function requestDetails(item: ConfirmationItem) {
    return (
      <>
        <p className="font-semibold text-ink">{item.title}</p>
        <p className="mt-1 text-sm text-ink/60">
          {item.agencyName}
          {item.travelMonth ? ` · ${item.travelMonth.slice(0, 7)}` : " · date not specified"}
          {item.groupSize ? ` · group of ${item.groupSize}` : ""}
          {item.singleRoom ? " · single room" : ""}
        </p>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5 md:px-12">
        <Link href="/supplier" className="font-display text-lg font-semibold text-ink">
          Italy Beyond Summer
        </Link>
        <p className="mt-1 text-sm">
          <Link href="/supplier" className="text-ink/60 underline">
            ← Back to your profile
          </Link>
        </p>
      </header>
      {viewingAs && <ViewAsBanner label={viewingAs.label} type="supplier" />}

      <section className="px-6 py-10 md:px-12">
        <h1 className="text-2xl font-semibold text-ink">Booking requests</h1>
        <p className="mt-1 max-w-xl text-ink/60">
          Agencies asking whether you can take a group on specific dates.
          Let us know as soon as you can so we can hold the dates.
        </p>

        <div className="mt-8 max-w-xl space-y-10">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              Awaiting your response ({awaiting.length})
            </h2>
            {awaiting.length === 0 ? (
              <p className="mt-3 text-sm text-ink/60">Nothing waiting on you right now.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {awaiting.map((item) => {
                  const overdue = isOverdue({
                    status: item.myStatus,
                    response_deadline: item.responseDeadline,
                  });
                  return (
                    <li
                      key={item.confirmationId}
                      className="rounded-card border border-line bg-white p-4"
                    >
                      {requestDetails(item)}
                      {item.responseDeadline && (
                        <p className={`mt-1 text-xs font-semibold ${overdue ? "text-wine" : "text-ink/50"}`}>
                          {overdue
                            ? "Overdue — please respond as soon as you can"
                            : `Respond by ${new Date(item.responseDeadline).toLocaleString("en-GB", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`}
                        </p>
                      )}
                      <div className="mt-3">
                        <ConfirmButtons confirmationId={item.confirmationId} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {waitingOnOthers.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
                Waiting on other suppliers ({waitingOnOthers.length})
              </h2>
              <ul className="mt-3 space-y-3">
                {waitingOnOthers.map((item) => (
                  <li
                    key={item.confirmationId}
                    className="rounded-card border border-line bg-white p-4"
                  >
                    {requestDetails(item)}
                    <p className="mt-2 text-sm text-ink/60">
                      You said {item.myStatus === "yes" ? "yes" : "no"} — waiting on the other
                      suppliers for this request.
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
                Resolved ({resolved.length})
              </h2>
              <ul className="mt-3 space-y-3">
                {resolved.map((item) => (
                  <li
                    key={item.confirmationId}
                    className="rounded-card border border-line bg-white p-4"
                  >
                    {requestDetails(item)}
                    <p className="mt-2 text-sm font-semibold text-ink/80">
                      {item.parentStatus === "confirmed"
                        ? "The customer booked this."
                        : "The customer cancelled this request."}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
