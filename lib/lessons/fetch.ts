import type { SupabaseClient } from "@supabase/supabase-js";
import type { LessonActivity, LessonActivityType } from "@/types/lesson";
import { LESSON_ACTIVITY_TYPES } from "@/types/lesson";

function normalizeActivity(row: Record<string, unknown>): LessonActivity {
  const resources =
    row.resources && typeof row.resources === "object"
      ? (row.resources as LessonActivity["resources"])
      : {};

  return {
    id: row.id as string,
    lesson_id: row.lesson_id as string,
    activity_type: row.activity_type as LessonActivityType,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    duration_minutes:
      row.duration_minutes === null || row.duration_minutes === undefined
        ? null
        : Number(row.duration_minutes),
    resources,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export async function fetchLessonActivities(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<LessonActivity[]> {
  const { data, error } = await supabase
    .from("lesson_activities")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeActivity(row as Record<string, unknown>));
}

export function isLessonActivityType(value: unknown): value is LessonActivityType {
  return (
    typeof value === "string" &&
    LESSON_ACTIVITY_TYPES.includes(value as LessonActivityType)
  );
}

export { normalizeActivity };
