"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { translateSupplierProfile, type SourceLanguage } from "@/lib/ai/translate-supplier";

type ProfileTextInput = {
  supplierId: string;
  language: SourceLanguage;
  headline: string;
  description: string;
  priceIncludes: string;
};

type SupplierDetailsInput = {
  supplierId: string;
  category: string;
  pricePerPerson: number | null;
  address: string;
  logoUrl: string | null;
  starRating: number | null;
  qualityRating: number | null;
  contactPhone: string;
};

// Allows either the supplier who owns this row, or an admin acting on
// their behalf (e.g. filling in a profile for a supplier who needs help).
// The RLS policies on each table separately enforce the same rule at the
// database level — this is just so the action fails with a clear message
// instead of a raw RLS error.
async function requireOwnSupplier(supplierId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("supplier_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    return supabase;
  }

  if (profile?.supplier_id !== supplierId) {
    throw new Error("Not authorized");
  }

  return supabase;
}

async function saveSourceRow(input: ProfileTextInput, status: "draft" | "approved") {
  const supabase = await requireOwnSupplier(input.supplierId);

  const { error } = await supabase.from("supplier_translations").upsert(
    {
      supplier_id: input.supplierId,
      language: input.language,
      is_source: true,
      headline: input.headline,
      description: input.description,
      price_includes: input.priceIncludes,
      status,
      translated_by: "human",
    },
    { onConflict: "supplier_id,language" }
  );

  if (error) throw new Error(error.message);

  return supabase;
}

export async function saveDraft(input: ProfileTextInput) {
  await saveSourceRow(input, "draft");
  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function submitProfile(input: ProfileTextInput) {
  const supabase = await saveSourceRow(input, "approved");

  // The supplier's own text is live immediately (saved above). Translation
  // into the agency-facing languages happens now; a failure here shouldn't
  // block the supplier's own published text, so it's surfaced as a
  // soft warning instead of throwing.
  try {
    const translations = await translateSupplierProfile({
      language: input.language,
      headline: input.headline,
      description: input.description,
      price_includes: input.priceIncludes,
    });

    for (const translation of translations) {
      const { error } = await supabase.from("supplier_translations").upsert(
        {
          supplier_id: input.supplierId,
          language: translation.language,
          is_source: false,
          headline: translation.headline,
          description: translation.description,
          price_includes: translation.price_includes,
          status: "pending_review",
          translated_by: "ai",
        },
        { onConflict: "supplier_id,language" }
      );
      if (error) throw new Error(error.message);
    }

    revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
    return { ok: true, translationWarning: false };
  } catch (err) {
    console.error("Supplier translation failed", err);
    revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
    return { ok: true, translationWarning: true };
  }
}

// Category/price/address are factual, one value per supplier — not
// per-language marketing copy, so they're saved directly with no
// translation or admin approval step.
export async function updateSupplierDetails(input: SupplierDetailsInput) {
  const supabase = await requireOwnSupplier(input.supplierId);

  const { error } = await supabase
    .from("suppliers")
    .update({
      category: input.category,
      price_per_person: input.pricePerPerson,
      address: input.address,
      logo_url: input.logoUrl,
      star_rating: input.starRating,
      quality_rating: input.qualityRating,
      contact_phone: input.contactPhone || null,
    })
    .eq("id", input.supplierId);

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function addSupplierImage(supplierId: string, url: string) {
  const supabase = await requireOwnSupplier(supplierId);

  const { error } = await supabase
    .from("supplier_images")
    .insert({ supplier_id: supplierId, url });

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function removeSupplierImage(supplierId: string, imageId: string) {
  const supabase = await requireOwnSupplier(supplierId);

  const { error } = await supabase
    .from("supplier_images")
    .delete()
    .eq("id", imageId)
    .eq("supplier_id", supplierId);

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

type RoomTypeInput = {
  supplierId: string;
  name: string;
  capacity: number;
  pricePerNight: number | null;
  singleSupplement: number | null;
  description: string;
  sortOrder?: number;
};

export async function addRoomType(input: RoomTypeInput) {
  const supabase = await requireOwnSupplier(input.supplierId);

  const { data, error } = await supabase
    .from("hotel_room_types")
    .insert({
      supplier_id: input.supplierId,
      name: input.name,
      capacity: input.capacity,
      price_per_night: input.pricePerNight,
      single_supplement: input.singleSupplement,
      description: input.description,
      sort_order: input.sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true, id: data.id as string };
}

export async function updateRoomType(roomTypeId: string, input: RoomTypeInput) {
  const supabase = await requireOwnSupplier(input.supplierId);

  const { error } = await supabase
    .from("hotel_room_types")
    .update({
      name: input.name,
      capacity: input.capacity,
      price_per_night: input.pricePerNight,
      single_supplement: input.singleSupplement,
      description: input.description,
    })
    .eq("id", roomTypeId)
    .eq("supplier_id", input.supplierId);

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function removeRoomType(supplierId: string, roomTypeId: string) {
  const supabase = await requireOwnSupplier(supplierId);

  const { error } = await supabase
    .from("hotel_room_types")
    .delete()
    .eq("id", roomTypeId)
    .eq("supplier_id", supplierId);

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

// Persists a full reordering: `orderedIds` is every one of the
// supplier's room types in their new display order, and each gets its
// array index as its sort_order. Rewriting every row (rather than
// swapping just the two moved ones) is what makes this safe even when
// existing rows share the same sort_order — e.g. every room type
// created before this feature existed defaults to 0, so swapping two
// equal values would otherwise be a no-op.
export async function reorderRoomTypes(supplierId: string, orderedIds: string[]) {
  const supabase = await requireOwnSupplier(supplierId);

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("hotel_room_types")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("supplier_id", supplierId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function addRoomImage(supplierId: string, roomTypeId: string, url: string) {
  const supabase = await requireOwnSupplier(supplierId);

  const { data, error } = await supabase
    .from("hotel_room_images")
    .insert({ room_type_id: roomTypeId, url })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true, id: data.id as string };
}

export async function removeRoomImage(supplierId: string, roomTypeId: string, imageId: string) {
  const supabase = await requireOwnSupplier(supplierId);

  const { error } = await supabase
    .from("hotel_room_images")
    .delete()
    .eq("id", imageId)
    .eq("room_type_id", roomTypeId);

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  revalidatePath("/admin/suppliers");
  return { ok: true };
}
