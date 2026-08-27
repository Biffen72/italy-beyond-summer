import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateSupplierProfile } from "@/lib/ai/translate-supplier";

// Re-runs AI translation for a supplier's source-language profile.
// Called by the supplier's own "Publish" action on submit; kept as a
// standalone route so it can also be triggered again later (e.g. an
// admin "retry translation" button) without duplicating this logic.
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { supplierId } = await request.json();
  if (!supplierId) {
    return NextResponse.json({ error: "Missing supplierId" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("supplier_id")
    .eq("id", user.id)
    .single();

  if (profile?.supplier_id !== supplierId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: source } = await supabase
    .from("supplier_translations")
    .select("language, headline, description, price_includes")
    .eq("supplier_id", supplierId)
    .eq("is_source", true)
    .single();

  if (!source) {
    return NextResponse.json(
      { error: "No source profile to translate yet" },
      { status: 400 }
    );
  }

  try {
    const translations = await translateSupplierProfile(source);

    for (const translation of translations) {
      const { error } = await supabase.from("supplier_translations").upsert(
        {
          supplier_id: supplierId,
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
  } catch (err) {
    console.error("Supplier translation failed", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
