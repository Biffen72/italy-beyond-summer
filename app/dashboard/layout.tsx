import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { DashboardNav } from "./DashboardNav";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { resolveAgencyId } from "@/lib/viewAs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { viewingAs } = await resolveAgencyId(supabase, user.id);

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-6 py-5 md:px-12">
        <div>
          <p className="font-display text-lg font-semibold text-ink">
            Italy Beyond Summer
          </p>
          <p className="text-sm text-ink/60">
            {profile?.full_name ? `Welcome back, ${profile.full_name}` : "Welcome back"}
          </p>
        </div>
        <SignOutButton />
      </header>
      <DashboardNav />
      {viewingAs && <ViewAsBanner label={viewingAs.label} type="agency" />}
      {children}
    </div>
  );
}
