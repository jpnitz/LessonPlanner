import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { fetchCalendarEvents } from "@/lib/calendar/fetch";
import { endOfDay, startOfDay } from "@/lib/calendar/date-utils";
import {
  buildProposedLessonsInstruction,
  callLlm,
  extractProposedLessons,
  resolveLlmApiKey,
  type LlmMessage,
} from "@/lib/llm/client";
import {
  formatPlannerConstraints,
  scheduleLessonSlots,
} from "@/lib/lesson-planner/schedule";
import {
  assertStudentAccess,
  getManagedStudents,
  resolveActiveStudentId,
} from "@/lib/students/access";
import type { ProposedCurriculum } from "@/types/curriculum";
import type { ProposedLesson, ProposedLessonPlan } from "@/types/lesson";

type GenerateRequestBody = {
  studentId?: string;
  source?: "current_topic" | "proposed_curriculum";
  standardId?: string;
  proposedCurriculum?: ProposedCurriculum;
};

type StandardPayload = {
  standard_id: string | null;
  standard_title: string;
  curriculum_id: string | null;
  curriculum_title: string | null;
  ksas: Array<{
    ksa_type: string;
    title: string;
    description?: string | null;
  }>;
};

function buildStandardsPayload(
  body: GenerateRequestBody,
  supabase: Awaited<ReturnType<typeof getAuthenticatedParent>>["supabase"],
): Promise<StandardPayload[]> {
  if (body.source === "proposed_curriculum" && body.proposedCurriculum) {
    return Promise.resolve(
      body.proposedCurriculum.standards.map((standard) => ({
        standard_id: null,
        standard_title: standard.title,
        curriculum_id: null,
        curriculum_title: body.proposedCurriculum!.title,
        ksas: (standard.ksas ?? []).map((ksa) => ({
          ksa_type: ksa.ksa_type,
          title: ksa.title,
          description: ksa.description ?? null,
        })),
      })),
    );
  }

  if (!body.standardId) {
    return Promise.resolve([]);
  }

  return (async () => {
    const { data: standard, error: standardError } = await supabase
      .from("learning_standards")
      .select("id, title, curriculum_id, domain_title")
      .eq("id", body.standardId)
      .maybeSingle();

    if (standardError) throw new Error(standardError.message);
    if (!standard) return [];

    const { data: curriculum } = await supabase
      .from("curricula")
      .select("id, title")
      .eq("id", standard.curriculum_id)
      .maybeSingle();

    const { data: ksas, error: ksasError } = await supabase
      .from("standard_ksas")
      .select("ksa_type, title, description")
      .eq("standard_id", standard.id)
      .order("sort_order", { ascending: true });

    if (ksasError) throw new Error(ksasError.message);

    return [
      {
        standard_id: standard.id as string,
        standard_title: standard.title as string,
        curriculum_id: standard.curriculum_id as string,
        curriculum_title: (curriculum?.title as string | undefined) ?? null,
        ksas: (ksas ?? []).map((ksa) => ({
          ksa_type: ksa.ksa_type as string,
          title: ksa.title as string,
          description: (ksa.description as string | null) ?? null,
        })),
      },
    ];
  })();
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = (await request.json()) as GenerateRequestBody;
  const source = body.source ?? "current_topic";
  const isStudentAccount = user.user_metadata?.account_type === "student";

  if (isStudentAccount) {
    return jsonError("Student accounts cannot generate lessons.", 403);
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

  let standardsPayload: StandardPayload[];
  try {
    standardsPayload = await buildStandardsPayload(body, supabase);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load standards.",
      500,
    );
  }

  if (standardsPayload.length === 0) {
    return jsonError(
      source === "proposed_curriculum"
        ? "Proposed curriculum with standards is required."
        : "A learning standard with KSAs is required.",
      400,
    );
  }

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

  const settings = {
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

  const plannerConstraints = formatPlannerConstraints(settings);

  const standardsText = standardsPayload
    .map(
      (standard) => `Standard: ${standard.standard_title}
Curriculum: ${standard.curriculum_title ?? "N/A"}
Standard ID: ${standard.standard_id ?? "new"}
Curriculum ID: ${standard.curriculum_id ?? "new"}
KSAs:
${standard.ksas
  .map(
    (ksa) =>
      `- ${ksa.ksa_type}: ${ksa.title}${ksa.description ? ` (${ksa.description})` : ""}`,
  )
  .join("\n")}`,
    )
    .join("\n\n");

  const llmMessages: LlmMessage[] = [
    {
      role: "system",
      content: [
        "You are a MicroSchool lesson-planning assistant.",
        "Create engaging, age-appropriate lesson plans with varied activity types.",
        buildProposedLessonsInstruction({
          plannerConstraints,
          standardCount: standardsPayload.length,
        }),
      ].join("\n\n"),
    },
    {
      role: "user",
      content: `Create lesson plan(s) for student ID ${activeStudentId} from these standards:\n\n${standardsText}`,
    },
  ];

  try {
    const result = await callLlm(keyResult.key, llmMessages);
    const { visibleContent, proposed } = extractProposedLessons(result.content);

    if (!proposed?.lessons?.length) {
      return jsonError(
        visibleContent ||
          "The assistant did not return structured lesson plans. Try again.",
        502,
      );
    }

    const now = new Date();
    const occupiedEvents = await fetchCalendarEvents(supabase, {
      start: startOfDay(now),
      end: endOfDay(new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000)),
      studentIds: [activeStudentId],
    });

    const occupied = occupiedEvents.map((event) => ({
      starts_at: new Date(event.starts_at),
      ends_at: new Date(event.ends_at),
    }));

    const slots = scheduleLessonSlots({
      lessonCount: proposed.lessons.length,
      settings,
      occupied,
      startFrom: now,
    });

    const lessons: ProposedLesson[] = proposed.lessons.map((lesson, index) => {
      const slot = slots[index];
      const sourceStandard = standardsPayload[index] ?? standardsPayload[0];

      return {
        client_id: lesson.client_id ?? `draft-${index}-${Date.now()}`,
        standard_id: lesson.standard_id ?? sourceStandard.standard_id,
        standard_title: lesson.standard_title ?? sourceStandard.standard_title,
        curriculum_id: lesson.curriculum_id ?? sourceStandard.curriculum_id,
        curriculum_title:
          lesson.curriculum_title ?? sourceStandard.curriculum_title,
        title: lesson.title,
        summary: lesson.summary,
        content: lesson.content,
        activities: lesson.activities,
        scheduled_starts_at: slot?.starts_at.toISOString(),
        scheduled_ends_at: slot?.ends_at.toISOString(),
      };
    });

    const draft: ProposedLessonPlan = {
      student_id: activeStudentId,
      lessons,
    };

    return NextResponse.json({
      message: visibleContent,
      draft,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Lesson generation failed.",
      502,
    );
  }
}
