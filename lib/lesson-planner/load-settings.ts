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
  supabase: SupabaseClient,
  students: StudentSafe[],
  settings: LessonPlannerSettings,
): Promise<{ topic: CurrentTopic | null; activeStudentId: string | null }> {
  const activeStudentId = resolveActiveStudentId(
    students,
    settings.selected_student_ids,
  );
  if (!activeStudentId) return { topic: null, activeStudentId: null };

  const { data: topicRow } = await supabase
    .from("student_current_topics")
    .select("standard_id")
    .eq("student_id", activeStudentId)
    .maybeSingle();

  if (!topicRow?.standard_id) {
    return { topic: null, activeStudentId };
  }

  const { data: standard } = await supabase
    .from("learning_standards")
    .select("id, title, domain_title, curriculum_id")
    .eq("id", topicRow.standard_id)
    .maybeSingle();

  if (!standard) return { topic: null, activeStudentId };

  const { data: curriculum } = await supabase
    .from("curricula")
    .select("id, title")
    .eq("id", standard.curriculum_id)
    .maybeSingle();

  if (!curriculum) return { topic: null, activeStudentId };

  return {
    activeStudentId,
    topic: {
      standardId: standard.id,
      standardTitle: standard.title,
      domainTitle: standard.domain_title,
      curriculumTitle: curriculum.title,
      curriculumId: curriculum.id,
      studentId: activeStudentId,
    },
  };
}
