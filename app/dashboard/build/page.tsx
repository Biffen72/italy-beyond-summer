import { createClient } from "@/lib/supabase/server";
import { BuildPackageForm } from "./BuildPackageForm";
import { resolveAgencyId } from "@/lib/viewAs";

export default async function BuildPackagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { agencyId, viewingAs } = await resolveAgencyId(supabase, user!.id);

  let agencyCountry: string | null = null;
  if (agencyId) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("country")
      .eq("id", agencyId)
      .single();
    agencyCountry = agency?.country ?? null;
  }

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Build your own package</h1>
      <p className="mt-1 max-w-2xl text-ink/60">
        Pick a region, then choose from the transport, hotels, activities
        and restaurants available there. Submit your selection and we'll
        follow up with a quote — no price shown here is final until we do.
      </p>

      <div className="mt-8 max-w-3xl">
        <BuildPackageForm agencyCountry={agencyCountry} readOnly={!!viewingAs} />
      </div>
    </section>
  );
}
