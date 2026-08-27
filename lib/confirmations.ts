import type { SupabaseClient } from "@supabase/supabase-js";

export type RequestType = "reservation" | "custom";

export type ConfirmationSummary = {
  status: "pending" | "ready_for_customer" | "declined_by_supplier";
  total: number;
  yesCount: number;
};

// One row per (request, supplier) asking "can you take this group on
// these dates?" — called right after a reservation_requests /
// custom_package_requests row is created, from the same agency session,
// so the RLS insert policy can check the request actually belongs to
// that agency.
export async function createConfirmationRows(
  supabase: SupabaseClient,
  requestType: RequestType,
  requestId: string,
  supplierIds: string[]
) {
  if (supplierIds.length === 0) return;

  const { error } = await supabase.from("booking_supplier_confirmations").insert(
    supplierIds.map((supplierId) => ({
      request_type: requestType,
      request_id: requestId,
      supplier_id: supplierId,
      status: "pending",
    }))
  );

  if (error) throw new Error(error.message);
}

// Computed live from the confirmation rows on every read, never stored —
// same "compute on read" shape as computePackageTotalEur in lib/pricing.ts.
// Batched so list pages (supplier's own requests, agency's "my requests",
// admin's lists) don't N+1 query per row.
export async function getConfirmationSummaries(
  supabase: SupabaseClient,
  requests: { requestType: RequestType; requestId: string }[]
): Promise<Map<string, ConfirmationSummary>> {
  const summaries = new Map<string, ConfirmationSummary>();
  if (requests.length === 0) return summaries;

  const requestIds = requests.map((r) => r.requestId);
  const { data } = await supabase
    .from("booking_supplier_confirmations")
    .select("request_type, request_id, status")
    .in("request_id", requestIds);

  const rowsByKey = new Map<string, { status: string }[]>();
  for (const row of data ?? []) {
    const key = `${row.request_type}:${row.request_id}`;
    const list = rowsByKey.get(key) ?? [];
    list.push(row);
    rowsByKey.set(key, list);
  }

  for (const { requestType, requestId } of requests) {
    const key = `${requestType}:${requestId}`;
    const rows = rowsByKey.get(key) ?? [];
    const total = rows.length;
    const yesCount = rows.filter((r) => r.status === "yes").length;
    const anyNo = rows.some((r) => r.status === "no");

    const status: ConfirmationSummary["status"] =
      total === 0 || yesCount === total
        ? "ready_for_customer"
        : anyNo
          ? "declined_by_supplier"
          : "pending";

    summaries.set(key, { status, total, yesCount });
  }

  return summaries;
}
