import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (profile?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6">
        <p className="max-w-sm text-center text-ink/70">
          This page is for administrators only.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5 md:px-12">
        <p className="font-display text-lg font-semibold text-ink">
          Italy Beyond Summer
        </p>
        <p className="text-sm text-ink/60">
          {profile.full_name ? `Welcome, ${profile.full_name}` : "Admin"}
        </p>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
