import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SupplierProfileForm } from "./SupplierProfileForm";
import { resolveSupplierId } from "@/lib/viewAs";
import { ViewAsBanner } from "@/components/ViewAsBanner";

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

export default async function SupplierPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const { supplierId, viewingAs } = await resolveSupplierId(supabase, user.id);

  if (!supplierId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6">
        <p className="max-w-sm text-center text-ink/70">
          Your account isn&apos;t linked to a supplier profile yet. Contact
          the Italy Beyond Summer team and we&apos;ll set it up.
        </p>
      </main>
    );
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("name, category, price_per_person, address, logo_url, star_rating, quality_rating")
    .eq("id", supplierId)
    .single();

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

  const { count: pendingRequestCount } = await supabase
    .from("booking_supplier_confirmations")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId)
    .eq("status", "pending");

  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");

  const { data: supplierCategories } = await supabase
    .from("categories")
    .select("value")
    .eq("kind", "supplier")
    .order("sort_order");
  const categoryOptions = (supplierCategories ?? []).map((c) => c.value);

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5 md:px-12">
        <Link href="/supplier" className="font-display text-lg font-semibold text-ink">
          Italy Beyond Summer
        </Link>
        <p className="text-sm text-ink/60">
          {profile?.full_name ? `Welcome, ${profile.full_name}` : "Your supplier profile"}
        </p>
      </header>
      {viewingAs && <ViewAsBanner label={viewingAs.label} type="supplier" />}

      <section className="px-6 py-10 md:px-12">
        <h1 className="text-2xl font-semibold text-ink">
          {supplier?.name ?? "Your profile"}
        </h1>
        <p className="mt-1 max-w-xl text-ink/60">
          Fill in your supplier details and write your profile text in your
          own language. We translate it automatically into Norwegian,
          Swedish, Danish and English, and publish each translation as soon
          as it&apos;s approved.
        </p>

        {!!pendingRequestCount && (
          <Link
            href="/supplier/requests"
            className="mt-4 block max-w-xl rounded-card border border-wine bg-wine/5 px-4 py-3 text-sm font-semibold text-wine transition hover:bg-wine/10"
          >
            {pendingRequestCount} booking {pendingRequestCount === 1 ? "request" : "requests"}{" "}
            awaiting your response — respond here →
          </Link>
        )}

        {!!projectCount && (
          <Link
            href="/supplier/projects"
            className="mt-4 block max-w-xl rounded-card border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-wine"
          >
            {projectCount} upcoming {projectCount === 1 ? "project" : "projects"} — see your
            rooms/program →
          </Link>
        )}

        <div className="mt-8 max-w-xl">
          <SupplierProfileForm
            supplierId={supplierId}
            initialDetails={{
              category: supplier?.category ?? "",
              pricePerPerson: supplier?.price_per_person ?? null,
              address: supplier?.address ?? "",
              logoUrl: supplier?.logo_url ?? null,
              starRating: supplier?.star_rating ?? null,
              qualityRating: supplier?.quality_rating ?? null,
            }}
            initialImages={images ?? []}
            initialText={sourceTranslation ?? null}
            initialRoomTypes={roomTypes}
            categoryOptions={categoryOptions}
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
                      <span className="ml-2 text-xs text-wine">(your language)</span>
                    )}
                  </span>
                  <span className="text-ink/60">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
