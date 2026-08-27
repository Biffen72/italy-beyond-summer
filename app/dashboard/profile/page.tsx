import { createClient } from "@/lib/supabase/server";
import { AgencyProfileForm } from "./AgencyProfileForm";
import { resolveAgencyId } from "@/lib/viewAs";

export default async function AgencyProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { agencyId, viewingAs } = await resolveAgencyId(supabase, user!.id);

  if (!agencyId) {
    return (
      <section className="px-6 py-10 md:px-12">
        <p className="max-w-sm text-ink/70">
          Your account isn&apos;t linked to an agency yet. Contact the Italy
          Beyond Summer team and we&apos;ll set it up.
        </p>
      </section>
    );
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select(
      "name, address, city, country, mobile_phone, contact_email, billing_address, electronic_invoice_address, logo_url"
    )
    .eq("id", agencyId)
    .single();

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">
        Thanks for registering — here&apos;s your customer profile
      </h1>
      <p className="mt-1 max-w-xl text-ink/60">
        Please complete your registration below. You can skip this for now
        and come back to it later from the dashboard.
      </p>

      <div className="mt-8 max-w-xl">
        <AgencyProfileForm
          agencyId={agencyId}
          initial={{
            name: agency?.name ?? "",
            address: agency?.address ?? "",
            city: agency?.city ?? "",
            country: (agency?.country as "NO" | "SE" | "DK" | null) ?? "",
            mobilePhone: agency?.mobile_phone ?? "",
            contactEmail: agency?.contact_email ?? "",
            billingAddress: agency?.billing_address ?? "",
            electronicInvoiceAddress: agency?.electronic_invoice_address ?? "",
            logoUrl: agency?.logo_url ?? null,
          }}
          readOnly={!!viewingAs}
        />
      </div>
    </section>
  );
}
