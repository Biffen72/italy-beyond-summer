import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { resolveAgencyId } from "@/lib/viewAs";
import { ProjectHeaderForm } from "./ProjectHeaderForm";
import { RoomsEditor } from "./RoomsEditor";
import { ProgramEditor } from "./ProgramEditor";
import { SubmitProjectButton } from "./SubmitProjectButton";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { agencyId, viewingAs } = await resolveAgencyId(supabase, user!.id);

  const { data: project } = await supabase
    .from("projects")
    .select("id, request_type, request_id, name, start_date, end_date, group_size, status")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  // Suppliers linked to the original request — the pool the room editor
  // and program editor pick from.
  let supplierIds: string[] = [];
  if (project.request_type === "reservation") {
    const { data: reservation } = await supabase
      .from("reservation_requests")
      .select("package_id")
      .eq("id", project.request_id)
      .maybeSingle();
    if (reservation?.package_id) {
      const { data: links } = await supabase
        .from("package_suppliers")
        .select("supplier_id")
        .eq("package_id", reservation.package_id);
      supplierIds = (links ?? []).map((l) => l.supplier_id);
    }
  } else {
    const { data: links } = await supabase
      .from("custom_package_request_suppliers")
      .select("supplier_id")
      .eq("request_id", project.request_id);
    supplierIds = (links ?? []).map((l) => l.supplier_id);
  }

  const { data: suppliers } =
    supplierIds.length > 0
      ? await supabase
          .from("suppliers")
          .select("id, name, category")
          .in("id", supplierIds)
      : { data: [] };

  const hotelSuppliers = (suppliers ?? []).filter((s) => s.category === "Hotel");

  const { data: roomTypes } =
    hotelSuppliers.length > 0
      ? await supabase
          .from("hotel_room_types")
          .select("id, supplier_id, name, capacity, price_per_night")
          .in(
            "supplier_id",
            hotelSuppliers.map((h) => h.id)
          )
      : { data: [] };

  const hotelOptions = hotelSuppliers.map((h) => ({
    supplierId: h.id,
    supplierName: h.name,
    roomTypes: (roomTypes ?? [])
      .filter((rt) => rt.supplier_id === h.id)
      .map((rt) => ({
        id: rt.id,
        name: rt.name,
        capacity: rt.capacity,
        priceLabel: rt.price_per_night != null ? `€${rt.price_per_night}/night` : "no price set",
      })),
  }));

  const { data: rooms } = await supabase
    .from("project_rooms")
    .select("id, supplier_id, room_type_label, sort_order")
    .eq("project_id", project.id)
    .order("sort_order");

  const { data: guests } = await supabase
    .from("project_room_guests")
    .select("id, room_id, full_name, email, mobile, allergies, sort_order")
    .in("room_id", (rooms ?? []).map((r) => r.id).length > 0 ? (rooms ?? []).map((r) => r.id) : [""])
    .order("sort_order");

  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  const initialRooms = (rooms ?? []).map((r) => ({
    id: r.id,
    supplierName: supplierNameById.get(r.supplier_id) ?? "Hotel",
    roomTypeLabel: r.room_type_label,
    guests: (guests ?? [])
      .filter((g) => g.room_id === r.id)
      .map((g) => ({
        id: g.id,
        fullName: g.full_name,
        email: g.email,
        mobile: g.mobile,
        allergies: g.allergies,
      })),
  }));

  const { data: programDays } = await supabase
    .from("project_program_days")
    .select("day_number, title, description, time_of_day, supplier_id")
    .eq("project_id", project.id)
    .order("day_number")
    .order("sort_order");

  const initialDays = (programDays ?? []).map((d) => ({
    dayNumber: d.day_number,
    title: d.title,
    description: d.description ?? "",
    timeOfDay: d.time_of_day ?? "",
    supplierId: d.supplier_id,
  }));

  // The agency can keep editing after submitting — submission only
  // controls whether suppliers can see it (RLS gates on status). Admin's
  // "view as" preview stays read-only like every other impersonated page.
  const readOnly = !!viewingAs;

  return (
    <section className="px-6 py-10 md:px-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wine">
            {project.status === "submitted" ? "Program submitted" : "Draft"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{project.name}</h1>
        </div>
      </div>

      <div className="mt-6 max-w-4xl">
        {viewingAs ? (
          <p className="rounded-card border border-line bg-white p-4 text-sm text-ink/70">
            {project.name} · {project.start_date ?? "no start date"} –{" "}
            {project.end_date ?? "no end date"} · group of {project.group_size ?? "?"}
          </p>
        ) : (
          <ProjectHeaderForm
            projectId={project.id}
            initialName={project.name}
            initialStartDate={project.start_date}
            initialEndDate={project.end_date}
            initialGroupSize={project.group_size}
          />
        )}
      </div>

      <div className="mt-10 max-w-4xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Rooms</h2>
        <div className="mt-4">
          <RoomsEditor
            projectId={project.id}
            hotelOptions={hotelOptions}
            initialRooms={initialRooms}
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="mt-10 max-w-4xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Day-by-day program
        </h2>
        <div className="mt-4">
          <ProgramEditor
            projectId={project.id}
            supplierOptions={suppliers ?? []}
            initialDays={initialDays}
            readOnly={readOnly}
          />
        </div>
      </div>

      {!readOnly && project.status === "draft" && (
        <div className="mt-10 max-w-4xl border-t border-line pt-6">
          <SubmitProjectButton projectId={project.id} />
        </div>
      )}
      {!readOnly && project.status === "submitted" && (
        <p className="mt-10 max-w-4xl border-t border-line pt-6 text-sm text-ink/60">
          Submitted — suppliers can now see their relevant part of this project.
        </p>
      )}
    </section>
  );
}
