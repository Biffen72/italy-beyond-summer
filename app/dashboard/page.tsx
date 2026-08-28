import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { resolveAgencyId } from "@/lib/viewAs";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { agencyId } = await resolveAgencyId(supabase, user!.id);

  let profileIncomplete = false;
  if (agencyId) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("address, city, country, mobile_phone")
      .eq("id", agencyId)
      .single();
    profileIncomplete =
      !agency?.address || !agency?.city || !agency?.country || !agency?.mobile_phone;
  }

  const { data: themes } = await supabase
    .from("categories")
    .select("value, label, icon")
    .eq("kind", "package")
    .eq("show_on_homepage", true)
    .order("sort_order");

  return (
    <section className="px-6 py-10 md:px-12">
      {profileIncomplete && (
        <div className="mb-8 flex items-center justify-between rounded-card border border-line bg-white px-5 py-4">
          <p className="text-sm text-ink/70">
            Your customer profile is incomplete — company details help us
            serve you better.
          </p>
          <Link
            href="/dashboard/profile"
            className="whitespace-nowrap text-sm font-semibold text-wine underline decoration-line underline-offset-4 hover:text-wine-dark"
          >
            Complete profile
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">What are your customers looking for?</h1>
          <p className="mt-1 text-ink/60">
            Pick a theme to see ready-to-sell 7-night packages, or build your
            own from scratch.
          </p>
        </div>
        <Link
          href="/dashboard/build"
          className="whitespace-nowrap rounded-card border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-wine"
        >
          Build your own package
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {(themes ?? []).map((theme) => (
          <Link
            key={theme.value}
            href={`/dashboard/packages?theme=${theme.value}`}
            className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-white px-5 py-10 text-center transition hover:border-wine hover:shadow-sm"
          >
            {theme.icon && <span className="text-4xl">{theme.icon}</span>}
            <span className="text-lg font-semibold text-ink">{theme.label}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/dashboard/packages"
        className="mt-6 inline-block text-sm font-semibold text-wine underline decoration-line underline-offset-4 hover:text-wine-dark"
      >
        Or browse all packages →
      </Link>
    </section>
  );
}
