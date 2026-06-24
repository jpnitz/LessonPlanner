import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import {
  callLlm,
  extractProposedCurriculum,
  resolveLlmApiKey,
  type LlmMessage,
} from "@/lib/llm/client";
import {
  buildCreateCurriculumLearnerContext,
  buildCreateCurriculumSystemPrompt,
} from "@/lib/llm/prompts/create-curriculum";
import {
  assertStudentAccess,
  getManagedStudents,
  resolveActiveStudentId,
} from "@/lib/students/access";
import type { StudentSafe } from "@/types/profile";

type ChatRequestBody = {
  messages?: Array<{ role?: string; content?: string }>;
  studentId?: string;
  mode?: "chat" | "test_knowledge" | "create_curriculum";
  currentTopic?: {
    standardTitle?: string;
    domainTitle?: string | null;
    curriculumTitle?: string;
  };
};

function buildSystemPrompt(options: {
  mode: ChatRequestBody["mode"];
  currentTopic?: ChatRequestBody["currentTopic"];
  activeStudent?: StudentSafe | null;
  plannerSettings?: {
    hoursPerWeek: number | null;
    daysOfWeek: number[];
  };
}) {
  const mode = options.mode ?? "chat";

  if (mode === "create_curriculum" && options.activeStudent) {
    const learner = buildCreateCurriculumLearnerContext({
      displayName: options.activeStudent.display_name,
      birthday: options.activeStudent.birthday,
      hoursPerWeek: options.plannerSettings?.hoursPerWeek ?? null,
      daysOfWeek: options.plannerSettings?.daysOfWeek ?? [],
    });

    return buildCreateCurriculumSystemPrompt(learner);
  }

  const parts = [
    "You are a helpful MicroSchool lesson-planning assistant for parents, teachers, and students.",
    "Be concise, encouraging, and age-appropriate.",
    "Lesson scheduling is available from Curriculum or a proposed curriculum — generate lesson plans there to add them to the calendar.",
  ];

  if (
    options.currentTopic?.standardTitle &&
    mode !== "create_curriculum"
  ) {
    parts.push(
      `The learner's current topic is "${options.currentTopic.standardTitle}" in ${options.currentTopic.curriculumTitle ?? "their curriculum"}${options.currentTopic.domainTitle ? ` (${options.currentTopic.domainTitle})` : ""}. Use this as the default subject unless the user changes it.`,
    );
  }

  if (mode === "test_knowledge") {
    parts.push(
      "Quiz the learner on the current topic. Ask one question at a time, wait for their answer, give brief feedback, then continue.",
    );
  }

  return parts.join("\n\n");
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = (await request.json()) as ChatRequestBody;
  const mode = body.mode ?? "chat";
  const isStudentAccount = user.user_metadata?.account_type === "student";

  const students = await getManagedStudents(supabase, user.id, isStudentAccount);

  const { data: settingsRow } = await supabase
    .from("lesson_planner_settings")
    .select("selected_student_ids, hours_per_week, days_of_week")
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

  const apiKey = keyResult.key;
  const activeStudent =
    students.find((student) => student.id === activeStudentId) ?? null;

  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  const conversationMessages: LlmMessage[] = incomingMessages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content!.trim(),
    }));

  if (conversationMessages.length === 0) {
    return jsonError("At least one message is required.", 400);
  }

  const llmMessages: LlmMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        mode,
        currentTopic: body.currentTopic,
        activeStudent,
        plannerSettings: {
          hoursPerWeek:
            settingsRow?.hours_per_week === null ||
            settingsRow?.hours_per_week === undefined
              ? null
              : Number(settingsRow.hours_per_week),
          daysOfWeek: Array.isArray(settingsRow?.days_of_week)
            ? (settingsRow.days_of_week as number[])
            : [],
        },
      }),
    },
    ...conversationMessages,
  ];

  try {
    const result = await callLlm(apiKey, llmMessages, {
      temperature: mode === "create_curriculum" ? 0.4 : undefined,
      maxTokens: mode === "create_curriculum" ? 4096 : undefined,
    });

    const extraction =
      mode === "create_curriculum"
        ? extractProposedCurriculum(result.content)
        : {
            visibleContent: result.content,
            proposed: null,
            parseError: null,
          };

    return NextResponse.json({
      message: extraction.visibleContent,
      proposedCurriculum: extraction.proposed,
      proposedCurriculumError: extraction.parseError,
      studentId: activeStudentId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM request failed.";
    return jsonError(message, 502);
  }
}
