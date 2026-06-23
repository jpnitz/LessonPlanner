import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { buildCurriculumFromChat } from "@/lib/curriculum/build-from-chat";
import { resolveLlmApiKey } from "@/lib/llm/client";
import {
  assertStudentAccess,
  getManagedStudents,
  resolveActiveStudentId,
} from "@/lib/students/access";
import type { LessonPlannerSettings, ProposedCurriculum } from "@/types/curriculum";

type BuildRequestBody = {
  studentId?: string;
  proposedCurriculum?: ProposedCurriculum;
};

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = (await request.json()) as BuildRequestBody;
  const isStudentAccount = user.user_metadata?.account_type === "student";

  if (isStudentAccount) {
    return jsonError("Student accounts cannot build curricula.", 403);
  }

  if (!body.proposedCurriculum?.title || !body.proposedCurriculum.standards?.length) {
    return jsonError("Proposed curriculum with standards is required.", 400);
  }

  const students = await getManagedStudents(supabase, user.id, isStudentAccount);

  const { data: settingsRow } = await supabase
    .from("lesson_planner_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const selectedStudentIds = Array.isArray(settingsRow?.selected_student_ids)
    ? (settingsRow.selected_student_ids as string[])
    : [];

  const activeStudentId = resolveActiveStudentId(
    students,
    selectedStudentIds,
    body.studentId,
  );

  if (!activeStudentId) {
    return jsonError("No student profile found for this account.", 400);
  }

  const hasAccess = await assertStudentAccess(
    supabase,
    user.id,
    activeStudentId,
    isStudentAccount,
  );
  if (!hasAccess) return jsonError("Student not accessible.", 403);

  const keyResult = await resolveLlmApiKey(activeStudentId);
  if (!keyResult) {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message:
          "No LLM API key available. Add OPENAI_API_KEY to .env.local (server default), or open Profile → edit the student → LLM API key field.",
        studentId: activeStudentId,
      },
      { status: 422 },
    );
  }

  const settings: LessonPlannerSettings = {
    user_id: user.id,
    hours_per_week:
      settingsRow?.hours_per_week === null ||
      settingsRow?.hours_per_week === undefined
        ? null
        : Number(settingsRow.hours_per_week),
    hours_per_day:
      settingsRow?.hours_per_day === null ||
      settingsRow?.hours_per_day === undefined
        ? null
        : Number(settingsRow.hours_per_day),
    days_of_week: Array.isArray(settingsRow?.days_of_week)
      ? (settingsRow.days_of_week as number[])
      : [],
    selected_student_ids: selectedStudentIds,
  };

  try {
    const result = await buildCurriculumFromChat({
      supabase,
      userId: user.id,
      studentId: activeStudentId,
      proposedCurriculum: body.proposedCurriculum,
      settings,
      apiKey: keyResult.key,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not build curriculum plan.",
      502,
    );
  }
}
