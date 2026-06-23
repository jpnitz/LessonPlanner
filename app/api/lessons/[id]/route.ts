import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { fetchLessonActivities } from "@/lib/lessons/fetch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const { id } = await context.params;

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, managed_by_user_id, student_id")
    .eq("id", id)
    .maybeSingle();

  if (lessonError) return jsonError(lessonError.message, 500);
  if (!lesson) return jsonError("Lesson not found.", 404);

  try {
    const activities = await fetchLessonActivities(supabase, id);
    return NextResponse.json({ activities });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load activities.",
      500,
    );
  }
}
