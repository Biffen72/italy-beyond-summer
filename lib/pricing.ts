import type { SupabaseClient } from "@supabase/supabase-js";

export type Currency = "NOK" | "SEK" | "DKK";

// Rough fallback rates, only used if the day's live fetch fails and no
// cached row exists yet — keeps pricing from breaking entirely.
const FALLBACK_RATES = { nok: 11.5, sek: 11.2, dkk: 7.46 };

export function currencyForCountry(country: string | null | undefined): Currency {
  if (country === "SE") return "SEK";
  if (country === "DK") return "DKK";
  return "NOK";
}

// Rounds up to the platform's "charm price" — the nearest value ending in
// 495 or 995 (995, 1495, 1995, 2495, ...).
export function roundToCharmPrice(amount: number): number {
  if (amount <= 0) return 495;
  return Math.ceil(amount / 500) * 500 - 5;
}

export async function getExchangeRates(
  supabase: SupabaseClient
): Promise<{ nok: number; sek: number; dkk: number }> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("eur_to_nok, eur_to_sek, eur_to_dkk")
    .eq("id", today)
    .maybeSingle();

  if (cached) {
    return { nok: Number(cached.eur_to_nok), sek: Number(cached.eur_to_sek), dkk: Number(cached.eur_to_dkk) };
  }

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=NOK,SEK,DKK", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`);
    const json = await res.json();
    const rates = {
      nok: Number(json.rates.NOK),
      sek: Number(json.rates.SEK),
      dkk: Number(json.rates.DKK),
    };

    await supabase.from("exchange_rates").insert({
      id: today,
      eur_to_nok: rates.nok,
      eur_to_sek: rates.sek,
      eur_to_dkk: rates.dkk,
    });

    return rates;
  } catch (err) {
    console.error("Exchange rate fetch failed, using fallback", err);
    return FALLBACK_RATES;
  }
}

type SupplierForPricing = {
  id: string;
  category: string;
  price_per_person: number | null;
};

type RoomTypeForPricing = {
  supplier_id: string;
  price_per_night: number | null;
  single_supplement: number | null;
};

// Sums per-person, per-night prices for every linked supplier, then
// multiplies by the number of nights.
//
// For a Hotel, the per-night rate is `price_per_person` (the base rate
// set on the supplier, same field every other category uses) plus that
// hotel's cheapest room type's `price_per_night` — which for hotels is a
// *supplement* on top of the base rate, not a standalone room price (a
// standard room can carry a 0 supplement; a suite a higher one). When
// `singleRoom` is true, that room type's `single_supplement` is added on
// top as well — it only applies to a traveller booking that room alone,
// so it's opt-in per booking rather than assumed.
//
// Returns the EUR total before markup, and a count of linked suppliers
// with no usable price so callers can flag it.
export async function computePackageTotalEur(
  supabase: SupabaseClient,
  supplierIds: string[],
  nights: number,
  singleRoom = false
): Promise<{ eur: number; missingPriceCount: number }> {
  if (supplierIds.length === 0) return { eur: 0, missingPriceCount: 0 };

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, category, price_per_person")
    .in("id", supplierIds);

  const supplierList = (suppliers ?? []) as SupplierForPricing[];
  const hotelIds = supplierList.filter((s) => s.category === "Hotel").map((s) => s.id);

  const roomsByHotel = new Map<string, RoomTypeForPricing[]>();
  if (hotelIds.length > 0) {
    const { data: rooms } = await supabase
      .from("hotel_room_types")
      .select("supplier_id, price_per_night, single_supplement")
      .in("supplier_id", hotelIds);

    for (const r of (rooms ?? []) as RoomTypeForPricing[]) {
      const list = roomsByHotel.get(r.supplier_id) ?? [];
      list.push(r);
      roomsByHotel.set(r.supplier_id, list);
    }
  }

  let eur = 0;
  let missingPriceCount = 0;

  for (const s of supplierList) {
    if (s.price_per_person == null) {
      missingPriceCount++;
      continue;
    }

    // Non-hotel suppliers (a tasting, a transfer, a guided walk, ...) are
    // a flat one-time per-person fee, not multiplied by nights.
    if (s.category !== "Hotel") {
      eur += Number(s.price_per_person);
      continue;
    }

    const rooms = (roomsByHotel.get(s.id) ?? []).filter((r) => r.price_per_night != null);
    if (rooms.length === 0) {
      missingPriceCount++;
      continue;
    }
    const cheapest = rooms.reduce((min, r) =>
      Number(r.price_per_night) < Number(min.price_per_night) ? r : min
    );
    const singleExtra = singleRoom ? Number(cheapest.single_supplement ?? 0) : 0;
    // Hotels bill per person, per night.
    eur += (Number(s.price_per_person) + Number(cheapest.price_per_night) + singleExtra) * nights;
  }

  return { eur, missingPriceCount };
}

// Applies the 10% markup, converts to the agency's currency, and rounds
// to a charm price. Never returns per-supplier detail — total only.
export async function formatPackagePrice(
  supabase: SupabaseClient,
  eurTotal: number,
  country: string | null | undefined,
  // Manually-priced legacy packages (no linked suppliers to sum) are
  // treated as an already-final EUR figure admin chose deliberately —
  // still converted and charm-rounded, just without adding another 10%
  // on top of a number that was never a raw supplier-cost sum.
  applyMarkup = true
): Promise<string> {
  const currency = currencyForCountry(country);
  const rates = await getExchangeRates(supabase);
  const rate = currency === "NOK" ? rates.nok : currency === "SEK" ? rates.sek : rates.dkk;

  const base = applyMarkup ? eurTotal * 1.1 : eurTotal;
  const converted = base * rate;
  const rounded = roundToCharmPrice(converted);

  return `${currency} ${rounded.toLocaleString("en-US")}`;
}

// Convenience wrapper used by every package display: sums linked
// suppliers' prices (+10%, converted, charm-rounded) when the package has
// any; otherwise falls back to the package's own manual price_eur
// (converted/rounded, no extra markup — see formatPackagePrice above).
export async function getPackageDisplayPrice(
  supabase: SupabaseClient,
  pkg: { id: string; nights: number; price_eur: number },
  country: string | null | undefined
): Promise<string> {
  const { data: links } = await supabase
    .from("package_suppliers")
    .select("supplier_id")
    .eq("package_id", pkg.id);

  const supplierIds = (links ?? []).map((l) => l.supplier_id as string);

  if (supplierIds.length > 0) {
    const { eur } = await computePackageTotalEur(supabase, supplierIds, pkg.nights);
    if (eur > 0) {
      return formatPackagePrice(supabase, eur, country, true);
    }
  }

  return formatPackagePrice(supabase, Number(pkg.price_eur), country, false);
}
