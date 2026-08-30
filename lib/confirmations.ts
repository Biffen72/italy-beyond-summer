import type { SupabaseClient } from "@supabase/supabase-js";

export type RequestType = "reservation" | "custom";

export type ConfirmationSummary = {
  status: "pending" | "ready_for_customer" | "declined_by_supplier";
  total: number;
  yesCount: number;
};

export const SUPPLIER_RESPONSE_HOURS = 24;

export function isOverdue(row: { status: string; response_deadline: string | null }) {
  return row.status === "pending" && !!row.response_deadline && new Date(row.response_deadline) < new Date();
}

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

  const deadline = new Date(Date.now() + SUPPLIER_RESPONSE_HOURS * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("booking_supplier_confirmations").insert(
    supplierIds.map((supplierId) => ({
      request_type: requestType,
      request_id: requestId,
      supplier_id: supplierId,
      status: "pending",
      response_deadline: deadline,
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
    .select("id, request_type, request_id, status, is_alternative_for")
    .in("request_id", requestIds);

  const allRows = data ?? [];
  // A row that another row's is_alternative_for points to has been
  // replaced — it no longer represents an active supplier slot on the
  // booking, so it's excluded from readiness math entirely.
  const supersededIds = new Set(
    allRows.filter((r) => r.is_alternative_for).map((r) => r.is_alternative_for as string)
  );
  const activeRows = allRows.filter((r) => !supersededIds.has(r.id));

  const rowsByKey = new Map<string, { status: string }[]>();
  for (const row of activeRows) {
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
