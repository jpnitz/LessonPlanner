import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentTopic, LessonPlannerSettings } from "@/types/curriculum";
import { resolveActiveStudentId } from "@/lib/students/access";
import type { StudentSafe } from "@/types/profile";

export async function fetchLessonPlannerSettings(
  supabase: SupabaseClient,
  userId: string,
  primaryStudentId?: string | null,
): Promise<LessonPlannerSettings> {
  const { data } = await supabase
    .from("lesson_planner_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      user_id: userId,
      hours_per_week: null,
      hours_per_day: null,
      days_of_week: [],
      selected_student_ids: primaryStudentId ? [primaryStudentId] : [],
    };
  }

  return {
    user_id: data.user_id as string,
    hours_per_week:
      data.hours_per_week === null ? null : Number(data.hours_per_week),
    hours_per_day:
      data.hours_per_day === null ? null : Number(data.hours_per_day),
    days_of_week: Array.isArray(data.days_of_week)
      ? (data.days_of_week as number[])
      : [],
    selected_student_ids:
      Array.isArray(data.selected_student_ids) &&
      (data.selected_student_ids as string[]).length > 0
        ? (data.selected_student_ids as string[])
        : primaryStudentId
          ? [primaryStudentId]
          : [],
  };
}

export async function fetchInitialCurrentTopic(
  _supabase: SupabaseClient,
  students: StudentSafe[],
  settings: LessonPlannerSettings,
): Promise<{ topic: CurrentTopic | null; activeStudentId: string | null }> {
  const activeStudentId = resolveActiveStudentId(
    students,
    settings.selected_student_ids,
  );

  // Do not restore a persisted topic on page load — user selects explicitly.
  return { topic: null, activeStudentId };
}
