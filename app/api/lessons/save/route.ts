import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { normalizeEvent } from "@/lib/calendar/fetch";
import { assertStudentAccess } from "@/lib/students/access";
import type { SaveLessonPlanInput } from "@/types/lesson";

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = (await request.json()) as SaveLessonPlanInput;
  const isStudentAccount = user.user_metadata?.account_type === "student";

  if (isStudentAccount) {
    return jsonError("Student accounts cannot save lessons.", 403);
  }

  if (!body.student_id || !Array.isArray(body.lessons) || body.lessons.length === 0) {
    return jsonError("At least one lesson is required.", 400);
  }

  const allowed = await assertStudentAccess(
    supabase,
    user.id,
    body.student_id,
    isStudentAccount,
  );
  if (!allowed) return jsonError("Student is not accessible.", 403);

  const savedEvents = [];

  for (const lesson of body.lessons) {
    const title = lesson.title?.trim();
    if (!title) {
      return jsonError("Each lesson needs a title.", 400);
    }

    if (!lesson.scheduled_starts_at || !lesson.scheduled_ends_at) {
      return jsonError("Each lesson needs a scheduled time.", 400);
    }

    const startsAt = new Date(lesson.scheduled_starts_at);
    const endsAt = new Date(lesson.scheduled_ends_at);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return jsonError("Invalid scheduled time.", 400);
    }
    if (endsAt < startsAt) {
      return jsonError("Lesson end time must be after start time.", 400);
    }

    const { data: lessonRow, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        managed_by_user_id: user.id,
        student_id: body.student_id,
        curriculum_id: lesson.curriculum_id ?? null,
        standard_id: lesson.standard_id ?? null,
        title,
        summary: lesson.summary?.trim() || null,
        content: lesson.content?.trim() || null,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (lessonError) {
      return jsonError(lessonError.message, 500);
    }

    if (lesson.activities.length > 0) {
      const activityRows = lesson.activities.map((activity, index) => ({
        lesson_id: lessonRow.id,
        activity_type: activity.activity_type,
        title: activity.title,
        description: activity.description?.trim() || null,
        duration_minutes: activity.duration_minutes ?? null,
        resources: activity.resources ?? {},
        sort_order: index,
      }));

      const { error: activitiesError } = await supabase
        .from("lesson_activities")
        .insert(activityRows);

      if (activitiesError) {
        await supabase.from("lessons").delete().eq("id", lessonRow.id);
        return jsonError(activitiesError.message, 500);
      }
    }

    const { data: eventRow, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        managed_by_user_id: user.id,
        student_id: body.student_id,
        lesson_id: lessonRow.id,
        event_type: "lesson",
        title,
        description: lesson.summary?.trim() || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_all_day: false,
      })
      .select("id")
      .single();

    if (eventError) {
      await supabase.from("lessons").delete().eq("id", lessonRow.id);
      return jsonError(eventError.message, 500);
    }

    const { data: displayRow, error: displayError } = await supabase
      .from("calendar_events_display")
      .select("*")
      .eq("id", eventRow.id)
      .single();

    if (displayError) {
      return jsonError(displayError.message, 500);
    }

    savedEvents.push(normalizeEvent(displayRow));
  }

  return NextResponse.json({ events: savedEvents }, { status: 201 });
}
