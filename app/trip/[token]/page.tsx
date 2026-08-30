import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";

export default async function TripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, start_date, end_date, group_size, status")
    .eq("share_token", token)
    .maybeSingle();

  if (!project || project.status !== "submitted") notFound();

  const [{ data: rooms }, { data: days }] = await Promise.all([
    supabase
      .from("project_rooms")
      .select("id, supplier_id, room_type_label, sort_order")
      .eq("project_id", project.id)
      .order("sort_order"),
    supabase
      .from("project_program_days")
      .select("day_number, title, description, time_of_day, supplier_id, sort_order")
      .eq("project_id", project.id)
      .order("day_number")
      .order("sort_order"),
  ]);

  const supplierIds = [
    ...new Set(
      [...(rooms ?? []).map((r) => r.supplier_id), ...(days ?? []).map((d) => d.supplier_id)].filter(
        (id): id is string => !!id
      )
    ),
  ];

  const { data: suppliers } =
    supplierIds.length > 0
      ? await supabase
          .from("suppliers")
          .select("id, name, category, contact_phone")
          .in("id", supplierIds)
      : { data: [] };

  const supplierById = new Map((suppliers ?? []).map((s) => [s.id, s]));

  const roomsBySupplier = new Map<string, { supplierName: string; roomTypeLabels: string[] }>();
  for (const room of rooms ?? []) {
    const supplierName = supplierById.get(room.supplier_id)?.name ?? "Hotel";
    const entry = roomsBySupplier.get(room.supplier_id) ?? {
      supplierName,
      roomTypeLabels: [] as string[],
    };
    entry.roomTypeLabels.push(room.room_type_label);
    roomsBySupplier.set(room.supplier_id, entry);
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10 md:px-12">
      <div className="mx-auto max-w-xl">
        <p className="font-display text-lg font-semibold text-ink">Italy Beyond Summer</p>

        <div className="mt-6">
          <h1 className="font-display text-2xl font-semibold text-ink">{project.name}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {project.start_date ?? "?"} – {project.end_date ?? "?"}
            {project.group_size ? ` · group of ${project.group_size}` : ""}
          </p>
        </div>

        {roomsBySupplier.size > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              Accommodation
            </h2>
            <ul className="mt-3 space-y-2">
              {[...roomsBySupplier.values()].map((entry) => (
                <li
                  key={entry.supplierName}
                  className="rounded-card border border-line bg-white p-4"
                >
                  <p className="font-semibold text-ink">{entry.supplierName}</p>
                  <p className="mt-1 text-sm text-ink/60">{entry.roomTypeLabels.join(", ")}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Your program
          </h2>
          {(days ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">The program isn&apos;t ready yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {(days ?? []).map((day, i) => {
                const supplier = day.supplier_id ? supplierById.get(day.supplier_id) : null;
                return (
                  <li key={i} className="rounded-card border border-line bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                      Day {day.day_number}
                      {day.time_of_day ? ` · ${day.time_of_day}` : ""}
                    </p>
                    <p className="mt-1 font-semibold text-ink">{day.title}</p>
                    {day.description && (
                      <p className="mt-1 text-sm text-ink/70">{day.description}</p>
                    )}
                    {supplier && (
                      <p className="mt-2 text-sm text-ink/60">
                        {supplier.category}: {supplier.name}
                        {supplier.contact_phone ? ` · ${supplier.contact_phone}` : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
