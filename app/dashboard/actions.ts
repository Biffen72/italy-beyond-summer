"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computePackageTotalEur, currencyForCountry, getExchangeRates, roundToCharmPrice } from "@/lib/pricing";
import { createConfirmationRows } from "@/lib/confirmations";

export async function requestReservation(
  packageId: string,
  travelMonth: string,
  groupSize: number,
  singleRoom = false
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) throw new Error("Your account isn't linked to an agency");

  const { data: agency } = await supabase
    .from("agencies")
    .select("country")
    .eq("id", profile.agency_id)
    .single();

  const { data: pkg } = await supabase
    .from("packages")
    .select("id, nights, price_eur")
    .eq("id", packageId)
    .single();

  // Snapshot the price at the moment of request, so later changes to
  // supplier prices or exchange rates don't rewrite historical sales.
  let supplierCostEur = 0;
  let priceEur = Number(pkg?.price_eur ?? 0);
  let applyMarkup = false;
  let supplierIds: string[] = [];

  if (pkg) {
    const { data: links } = await supabase
      .from("package_suppliers")
      .select("supplier_id")
      .eq("package_id", pkg.id);
    supplierIds = (links ?? []).map((l) => l.supplier_id as string);

    if (supplierIds.length > 0) {
      const { eur } = await computePackageTotalEur(supabase, supplierIds, pkg.nights, singleRoom);
      if (eur > 0) {
        supplierCostEur = eur;
        priceEur = eur * 1.1;
        applyMarkup = true;
      }
    }
  }

  const currency = currencyForCountry(agency?.country);
  const rates = await getExchangeRates(supabase);
  const rate = currency === "NOK" ? rates.nok : currency === "SEK" ? rates.sek : rates.dkk;
  const convertedAmount = roundToCharmPrice(priceEur * rate);

  const { data: newRequest, error } = await supabase
    .from("reservation_requests")
    .insert({
      agency_id: profile.agency_id,
      package_id: packageId,
      travel_month: travelMonth,
      group_size: groupSize,
      price_eur_snapshot: priceEur,
      supplier_cost_eur_snapshot: applyMarkup ? supplierCostEur : null,
      currency,
      converted_amount: convertedAmount,
      single_room: singleRoom,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await createConfirmationRows(supabase, "reservation", newRequest.id, supplierIds);

  revalidatePath("/dashboard");
  return { ok: true };
}
