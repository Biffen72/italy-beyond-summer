import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveSupplierId } from "@/lib/viewAs";
import { ViewAsBanner } from "@/components/ViewAsBanner";

export default async function SupplierProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { supplierId, viewingAs } = await resolveSupplierId(supabase, user.id);
  if (!supplierId) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, start_date, end_date, group_size, status, request_type, request_id")
    .eq("id", id)
    .maybeSingle();
  if (!project || project.status !== "submitted") notFound();

  // Explicit app-level check (not just RLS) so admin's "view as supplier"
  // preview can't open a project this specific supplier was never asked
  // about — RLS alone would let it through via the separate admin policy.
  const { data: myConfirmation } = await supabase
    .from("booking_supplier_confirmations")
    .select("supplier_id")
    .eq("request_type", project.request_type)
    .eq("request_id", project.request_id)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (!myConfirmation) notFound();

  const { data: myRooms } = await supabase
    .from("project_rooms")
    .select("id, room_type_label")
    .eq("project_id", project.id)
    .eq("supplier_id", supplierId)
    .order("sort_order");

  const isHotelForThisProject = (myRooms ?? []).length > 0;

  const { data: guests } = isHotelForThisProject
    ? await supabase
        .from("project_room_guests")
        .select("id, room_id, full_name, allergies")
        .in("room_id", (myRooms ?? []).map((r) => r.id))
        .order("sort_order")
    : { data: [] };

  const { data: myDays } = await supabase
    .from("project_program_days")
    .select("day_number, title, description, time_of_day")
    .eq("project_id", project.id)
    .eq("supplier_id", supplierId)
    .order("day_number");

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5 md:px-12">
        <Link href="/supplier" className="font-display text-lg font-semibold text-ink">
          Italy Beyond Summer
        </Link>
        <p className="text-sm text-ink/60">Project</p>
      </header>
      {viewingAs && <ViewAsBanner label={viewingAs.label} type="supplier" />}

      <section className="px-6 py-10 md:px-12">
        <Link
          href="/supplier/projects"
          className="text-sm font-semibold text-wine underline decoration-line underline-offset-4 hover:text-wine-dark"
        >
          ← Upcoming projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{project.name}</h1>
        <p className="mt-1 text-ink/60">
          {project.start_date ?? "no start date"} – {project.end_date ?? "no end date"}
          {project.group_size ? ` · group of ${project.group_size}` : ""}
        </p>

        {isHotelForThisProject && (
          <div className="mt-8 max-w-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              Rooms
            </h2>
            <ul className="mt-3 space-y-3">
              {(myRooms ?? []).map((room) => (
                <li key={room.id} className="rounded-card border border-line bg-white p-4">
                  <p className="font-semibold text-ink">{room.room_type_label}</p>
                  <ul className="mt-2 space-y-1 text-sm text-ink/80">
                    {(guests ?? [])
                      .filter((g) => g.room_id === room.id)
                      .map((g) => (
                        <li key={g.id}>
                          {g.full_name}
                          {g.allergies ? ` — Allergies: ${g.allergies}` : ""}
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 max-w-xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Your program
          </h2>
          {!myDays || myDays.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">
              No program day is tagged to you for this project.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {myDays.map((d) => (
                <li key={d.day_number} className="rounded-card border border-line bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                    Day {d.day_number}
                    {d.time_of_day ? ` · ${d.time_of_day}` : ""}
                  </p>
                  <p className="mt-1 font-semibold text-ink">{d.title}</p>
                  {d.description && <p className="mt-1 text-sm text-ink/70">{d.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
