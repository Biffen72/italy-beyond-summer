"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/supplier/projects");
}

export async function updateProjectDetails(
  projectId: string,
  input: { name: string; startDate: string | null; endDate: string | null; groupSize: number | null }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      group_size: input.groupSize,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function addRoom(
  projectId: string,
  input: { supplierId: string; hotelRoomTypeId: string | null; roomTypeLabel: string }
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_rooms")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_rooms")
    .insert({
      project_id: projectId,
      supplier_id: input.supplierId,
      hotel_room_type_id: input.hotelRoomTypeId,
      room_type_label: input.roomTypeLabel,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidate(projectId);
  return { id: data.id as string };
}

export async function removeRoom(projectId: string, roomId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_rooms").delete().eq("id", roomId);
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function addGuest(
  projectId: string,
  roomId: string,
  input: { fullName: string; email: string | null; mobile: string | null; allergies: string | null }
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_room_guests")
    .select("sort_order")
    .eq("room_id", roomId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_room_guests")
    .insert({
      room_id: roomId,
      full_name: input.fullName,
      email: input.email,
      mobile: input.mobile,
      allergies: input.allergies,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidate(projectId);
  return { id: data.id as string };
}

export async function removeGuest(projectId: string, guestId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_room_guests").delete().eq("id", guestId);
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export type ProgramDayInput = {
  dayNumber: number;
  title: string;
  description: string;
  timeOfDay: string;
  supplierId: string | null;
};

export async function syncProgramDays(projectId: string, days: ProgramDayInput[]) {
  const supabase = await createClient();

  const { error: deleteErr } = await supabase
    .from("project_program_days")
    .delete()
    .eq("project_id", projectId);
  if (deleteErr) throw new Error(deleteErr.message);

  if (days.length > 0) {
    const { error: insertErr } = await supabase.from("project_program_days").insert(
      days.map((d, index) => ({
        project_id: projectId,
        day_number: d.dayNumber,
        title: d.title,
        description: d.description || null,
        time_of_day: d.timeOfDay || null,
        supplier_id: d.supplierId,
        sort_order: index,
      }))
    );
    if (insertErr) throw new Error(insertErr.message);
  }

  revalidate(projectId);
}

export async function submitProject(projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "submitted" })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidate(projectId);
}
