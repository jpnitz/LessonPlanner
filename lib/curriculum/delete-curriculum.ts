import type { SupabaseClient } from "@supabase/supabase-js";

export async function deleteUserCurriculum(
  supabase: SupabaseClient,
  userId: string,
  curriculumId: string,
) {
  const { data: curriculum, error: curriculumError } = await supabase
    .from("curricula")
    .select("id, managed_by_user_id")
    .eq("id", curriculumId)
    .maybeSingle();

  if (curriculumError) throw new Error(curriculumError.message);
  if (!curriculum) throw new Error("Curriculum not found.");
  if (curriculum.managed_by_user_id !== userId) {
    throw new Error("Only user-created curricula can be deleted.");
  }

  const { data: standards, error: standardsError } = await supabase
    .from("learning_standards")
    .select("id")
    .eq("curriculum_id", curriculumId);

  if (standardsError) throw new Error(standardsError.message);

  const standardIds = (standards ?? []).map((row) => row.id as string);

  if (standardIds.length > 0) {
    const { error: topicError } = await supabase
      .from("student_current_topics")
      .delete()
      .in("standard_id", standardIds);

    if (topicError) throw new Error(topicError.message);
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id")
    .eq("curriculum_id", curriculumId)
    .eq("managed_by_user_id", userId);

  if (lessonsError) throw new Error(lessonsError.message);

  const lessonIds = (lessons ?? []).map((row) => row.id as string);

  if (lessonIds.length > 0) {
    const { error: deleteLessonsError } = await supabase
      .from("lessons")
      .delete()
      .in("id", lessonIds);

    if (deleteLessonsError) throw new Error(deleteLessonsError.message);
  }

  const { error: assignmentError } = await supabase
    .from("student_curricula")
    .delete()
    .eq("curriculum_id", curriculumId);

  if (assignmentError) throw new Error(assignmentError.message);

  const { error: deleteCurriculumError } = await supabase
    .from("curricula")
    .delete()
    .eq("id", curriculumId)
    .eq("managed_by_user_id", userId);

  if (deleteCurriculumError) throw new Error(deleteCurriculumError.message);
}
