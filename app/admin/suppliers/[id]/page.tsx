import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SupplierProfileForm } from "@/app/supplier/SupplierProfileForm";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";

const LANGUAGE_LABEL: Record<string, string> = {
  it: "Italian",
  no: "Norwegian",
  sv: "Swedish",
  da: "Danish",
  en: "English",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Published",
  rejected: "Rejected",
};

export default async function AdminSupplierEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: supplierId } = await params;
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("name, category, price_per_person, address, logo_url, star_rating, quality_rating")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) {
    notFound();
  }

  const { data: images } = await supabase
    .from("supplier_images")
    .select("id, url")
    .eq("supplier_id", supplierId)
    .order("sort_order");

  const { data: roomTypesData } = await supabase
    .from("hotel_room_types")
    .select(
      "id, name, capacity, price_per_night, single_supplement, description, sort_order, hotel_room_images(id, url)"
    )
    .eq("supplier_id", supplierId)
    .order("sort_order");

  const roomTypes = (roomTypesData ?? []).map((r) => ({
    ...r,
    images: r.hotel_room_images ?? [],
  }));

  const { data: sourceTranslation } = await supabase
    .from("supplier_translations")
    .select("language, headline, description, price_includes")
    .eq("supplier_id", supplierId)
    .eq("is_source", true)
    .maybeSingle();

  const { data: allTranslations } = await supabase
    .from("supplier_translations")
    .select("language, status, is_source")
    .eq("supplier_id", supplierId)
    .order("language");

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">
        {supplier.name}
        <SupplierRatingBadge
          category={supplier.category}
          starRating={supplier.star_rating}
          qualityRating={supplier.quality_rating}
        />
      </h1>
      <p className="mt-1 max-w-xl text-ink/60">
        Editing this supplier&apos;s profile on their behalf. Anything you
        publish here goes live exactly as if the supplier had submitted it
        themselves.
      </p>

      <div className="mt-8 max-w-xl">
        <SupplierProfileForm
          supplierId={supplierId}
          initialDetails={{
            category: supplier.category ?? "",
            pricePerPerson: supplier.price_per_person ?? null,
            address: supplier.address ?? "",
            logoUrl: supplier.logo_url ?? null,
            starRating: supplier.star_rating ?? null,
            qualityRating: supplier.quality_rating ?? null,
          }}
          initialImages={images ?? []}
          initialText={sourceTranslation ?? null}
          initialRoomTypes={roomTypes ?? []}
          isAdmin
        />
      </div>

      {allTranslations && allTranslations.length > 0 && (
        <div className="mt-10 max-w-xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Status by language
          </h2>
          <ul className="mt-3 space-y-2">
            {allTranslations.map((t) => (
              <li
                key={t.language}
                className="flex items-center justify-between rounded-card border border-line bg-white px-4 py-2.5 text-sm"
              >
                <span className="text-ink">
                  {LANGUAGE_LABEL[t.language] ?? t.language}
                  {t.is_source && (
                    <span className="ml-2 text-xs text-wine">(source)</span>
                  )}
                </span>
                <span className="text-ink/60">{STATUS_LABEL[t.status] ?? t.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
