import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEventDisplay } from "@/types/calendar";

function normalizeEvent(row: Record<string, unknown>): CalendarEventDisplay {
  return {
    id: row.id as string,
    managed_by_user_id: row.managed_by_user_id as string,
    student_id: row.student_id as string,
    lesson_id: (row.lesson_id as string | null) ?? null,
    event_type: row.event_type as CalendarEventDisplay["event_type"],
    event_title: row.event_title as string,
    event_description: (row.event_description as string | null) ?? null,
    starts_at: row.starts_at as string,
    ends_at: row.ends_at as string,
    is_all_day: Boolean(row.is_all_day),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    lesson_title: (row.lesson_title as string | null) ?? null,
    lesson_summary: (row.lesson_summary as string | null) ?? null,
    lesson_content: (row.lesson_content as string | null) ?? null,
    lesson_status: (row.lesson_status as string | null) ?? null,
    curriculum_id: (row.curriculum_id as string | null) ?? null,
    curriculum_title: (row.curriculum_title as string | null) ?? null,
    standard_id: (row.standard_id as string | null) ?? null,
    standard_title: (row.standard_title as string | null) ?? null,
    student_display_name: row.student_display_name as string,
  };
}

export async function fetchCalendarEvents(
  supabase: SupabaseClient,
  options: {
    start: Date;
    end: Date;
    studentIds?: string[];
  },
): Promise<CalendarEventDisplay[]> {
  let query = supabase
    .from("calendar_events_display")
    .select("*")
    .gte("starts_at", options.start.toISOString())
    .lte("starts_at", options.end.toISOString())
    .order("starts_at", { ascending: true });

  if (options.studentIds && options.studentIds.length > 0) {
    query = query.in("student_id", options.studentIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => normalizeEvent(row as Record<string, unknown>));
}

export async function fetchCalendarEventById(
  supabase: SupabaseClient,
  eventId: string,
): Promise<CalendarEventDisplay | null> {
  const { data, error } = await supabase
    .from("calendar_events_display")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return normalizeEvent(data as Record<string, unknown>);
}

export { normalizeEvent };
