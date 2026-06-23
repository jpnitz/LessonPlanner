import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import type { LessonPlannerSettings } from "@/types/curriculum";

function normalizeSettings(row: Record<string, unknown>): LessonPlannerSettings {
  return {
    user_id: row.user_id as string,
    hours_per_week:
      row.hours_per_week === null || row.hours_per_week === undefined
        ? null
        : Number(row.hours_per_week),
    hours_per_day:
      row.hours_per_day === null || row.hours_per_day === undefined
        ? null
        : Number(row.hours_per_day),
    days_of_week: Array.isArray(row.days_of_week)
      ? (row.days_of_week as number[])
      : [],
    selected_student_ids: Array.isArray(row.selected_student_ids)
      ? (row.selected_student_ids as string[])
      : [],
  };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const { data, error } = await supabase
    .from("lesson_planner_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);

  if (!data) {
    return NextResponse.json({
      settings: {
        user_id: user.id,
        hours_per_week: null,
        hours_per_day: null,
        days_of_week: [],
        selected_student_ids: [],
      } satisfies LessonPlannerSettings,
    });
  }

  return NextResponse.json({ settings: normalizeSettings(data) });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = await request.json();

  const hours_per_week =
    body.hours_per_week === null || body.hours_per_week === ""
      ? null
      : Number(body.hours_per_week);
  const hours_per_day =
    body.hours_per_day === null || body.hours_per_day === ""
      ? null
      : Number(body.hours_per_day);

  if (
    (hours_per_week !== null && (Number.isNaN(hours_per_week) || hours_per_week < 0)) ||
    (hours_per_day !== null && (Number.isNaN(hours_per_day) || hours_per_day < 0))
  ) {
    return jsonError("Hours must be zero or positive numbers.", 400);
  }

  const days_of_week = Array.isArray(body.days_of_week)
    ? body.days_of_week.filter(
        (day: unknown) => typeof day === "number" && day >= 1 && day <= 7,
      )
    : [];

  const selected_student_ids = Array.isArray(body.selected_student_ids)
    ? body.selected_student_ids.filter((id: unknown) => typeof id === "string")
    : [];

  if (selected_student_ids.length > 0) {
    const { data: ownedStudents } = await supabase
      .from("students")
      .select("id")
      .eq("managed_by_user_id", user.id)
      .in("id", selected_student_ids);

    const ownedIds = new Set((ownedStudents ?? []).map((row) => row.id));
    const isStudentAccount = user.user_metadata?.account_type === "student";

    if (isStudentAccount) {
      const { data: selfStudent } = await supabase
        .from("students")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (selfStudent) ownedIds.add(selfStudent.id);
    }

    for (const id of selected_student_ids) {
      if (!ownedIds.has(id)) {
        return jsonError("One or more selected students are not accessible.", 403);
      }
    }
  }

  const payload = {
    user_id: user.id,
    hours_per_week,
    hours_per_day,
    days_of_week,
    selected_student_ids,
  };

  const { data, error } = await supabase
    .from("lesson_planner_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ settings: normalizeSettings(data) });
}
