import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { resolveAgencyLanguage } from "@/lib/agencyLanguage";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";
import { Gallery } from "@/components/Gallery";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user!.id)
    .single();

  let preferredLanguage: "no" | "sv" | "da" | "en" = "en";
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("country")
      .eq("id", profile.agency_id)
      .single();
    preferredLanguage = resolveAgencyLanguage(agency?.country);
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id, name, category, base_region, address, star_rating, quality_rating")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!supplier) {
    notFound();
  }

  const { data: images } = await supabase
    .from("supplier_images")
    .select("id, url")
    .eq("supplier_id", id)
    .order("sort_order");

  const { data: translations } = await supabase
    .from("supplier_translations")
    .select("language, headline, description, price_includes")
    .eq("supplier_id", id)
    .eq("status", "approved");

  const text =
    (translations ?? []).find((t) => t.language === preferredLanguage) ??
    (translations ?? []).find((t) => t.language === "en") ??
    (translations ?? [])[0] ??
    null;

  const { data: roomTypesData } =
    supplier.category === "Hotel"
      ? await supabase
          .from("hotel_room_types")
          .select("id, name, capacity, description, sort_order, hotel_room_images(id, url)")
          .eq("supplier_id", id)
          .order("sort_order")
      : { data: null };

  const roomTypes = roomTypesData?.map((r) => ({ ...r, images: r.hotel_room_images ?? [] }));

  return (
    <section className="px-6 py-10 md:px-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-wine">
        {supplier.category} · {supplier.base_region}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">
        {supplier.name}
        <SupplierRatingBadge
          category={supplier.category}
          starRating={supplier.star_rating}
          qualityRating={supplier.quality_rating}
        />
      </h1>
      {supplier.address && (
        <p className="mt-1 text-sm text-ink/60">{supplier.address}</p>
      )}

      {images && images.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <Gallery
            images={images}
            thumbClassName="aspect-square w-full rounded-card border border-line object-cover"
          />
        </div>
      )}

      <div className="mt-8 max-w-2xl">
        {text ? (
          <>
            <h2 className="text-xl font-semibold text-ink">{text.headline}</h2>
            <p className="mt-3 whitespace-pre-line text-ink/80">{text.description}</p>
            {text.price_includes && (
              <p className="mt-3 text-sm text-ink/60">
                Includes: {text.price_includes}
              </p>
            )}
          </>
        ) : (
          <p className="text-ink/60">
            A full profile for this supplier isn&apos;t published yet.
          </p>
        )}
      </div>

      {roomTypes && roomTypes.length > 0 && (
        <div className="mt-10 max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Room types
          </h2>
          <ul className="mt-3 space-y-2">
            {roomTypes.map((r) => (
              <li
                key={r.id}
                className="rounded-card border border-line bg-white px-4 py-3"
              >
                <p className="font-semibold text-ink">
                  {r.name} <span className="font-normal text-ink/60">· sleeps {r.capacity}</span>
                </p>
                {r.description && (
                  <p className="mt-1 text-sm text-ink/60">{r.description}</p>
                )}
                {r.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Gallery
                      images={r.images}
                      thumbClassName="h-16 w-16 rounded-card border border-line object-cover"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-10 max-w-2xl text-sm text-ink/50">
        Contact the Italy Beyond Summer team for pricing and availability.
      </p>
    </section>
  );
}
