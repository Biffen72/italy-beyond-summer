import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ViewAsTarget = { type: "agency" | "supplier"; id: string; label: string };

const COOKIE_NAME = "view_as";

export async function getViewAsTarget(): Promise<ViewAsTarget | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ViewAsTarget;
  } catch {
    return null;
  }
}

// Admin gets the impersonated agency (if any) instead of their own — they
// don't have one. Every other role behaves exactly as before: their own
// profiles.agency_id, with no impersonation concept at all.
export async function resolveAgencyId(
  supabase: SupabaseClient,
  userId: string
): Promise<{ agencyId: string | null; viewingAs: ViewAsTarget | null }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
    const target = await getViewAsTarget();
    if (target?.type === "agency") return { agencyId: target.id, viewingAs: target };
    return { agencyId: null, viewingAs: null };
  }

  return { agencyId: profile?.agency_id ?? null, viewingAs: null };
}

export async function resolveSupplierId(
  supabase: SupabaseClient,
  userId: string
): Promise<{ supplierId: string | null; viewingAs: ViewAsTarget | null }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("supplier_id, role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
    const target = await getViewAsTarget();
    if (target?.type === "supplier") return { supplierId: target.id, viewingAs: target };
    return { supplierId: null, viewingAs: null };
  }

  return { supplierId: profile?.supplier_id ?? null, viewingAs: null };
}
