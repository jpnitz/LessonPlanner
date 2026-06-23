import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCalendarEvents, normalizeEvent } from "@/lib/calendar/fetch";
import { endOfDay, startOfDay } from "@/lib/calendar/date-utils";
import { slugifyCurriculumTitle } from "@/lib/curriculum/slug";
import { fetchCurriculumDetail } from "@/lib/curriculum/fetch";
import {
  buildKsaGenerationInstruction,
  buildProposedLessonsInstruction,
  callLlm,
  extractProposedKsas,
  extractProposedLessons,
  PROPOSED_KSAS_MARKER,
} from "@/lib/llm/client";
import {
  formatPlannerConstraints,
  scheduleLessonSlots,
} from "@/lib/lesson-planner/schedule";
import type { CalendarEventDisplay } from "@/types/calendar";
import type {
  CurriculumDetail,
  LessonPlannerSettings,
  ProposedCurriculum,
} from "@/types/curriculum";
import type { ProposedLesson } from "@/types/lesson";

type SavedStandard = {
  id: string;
  title: string;
  domain_title: string | null;
  curriculum_id: string;
};

export type BuildFromChatResult = {
  curriculumId: string;
  curriculumTitle: string;
  standardsCount: number;
  ksasCount: number;
  lessonsCount: number;
  events: CalendarEventDisplay[];
  curriculumDetail: CurriculumDetail;
};

async function saveProposedCurriculum(
  supabase: SupabaseClient,
  userId: string,
  studentId: string,
  proposed: ProposedCurriculum,
) {
  const slug = slugifyCurriculumTitle(proposed.title);

  const { data: curriculum, error: curriculumError } = await supabase
    .from("curricula")
    .insert({
      slug,
      title: proposed.title.trim(),
      description: proposed.description?.trim() || null,
      sort_order: 100,
      managed_by_user_id: userId,
    })
    .select("id, title")
    .single();

  if (curriculumError) throw new Error(curriculumError.message);

  const savedStandards: SavedStandard[] = [];

  for (const [index, standard] of proposed.standards.entries()) {
    const { data: standardRow, error: standardError } = await supabase
      .from("learning_standards")
      .insert({
        curriculum_id: curriculum.id,
        domain_title: standard.domain_title?.trim() || null,
        title: standard.title.trim(),
        sort_order: index + 1,
      })
      .select("id, title, domain_title, curriculum_id")
      .single();

    if (standardError) throw new Error(standardError.message);
    savedStandards.push(standardRow as SavedStandard);
  }

  const { error: assignmentError } = await supabase.from("student_curricula").upsert(
    {
      student_id: studentId,
      curriculum_id: curriculum.id,
    },
    { onConflict: "student_id,curriculum_id" },
  );

  if (assignmentError) throw new Error(assignmentError.message);

  return {
    curriculumId: curriculum.id as string,
    curriculumTitle: curriculum.title as string,
    standards: savedStandards,
  };
}

async function generateAndSaveKsas(
  supabase: SupabaseClient,
  apiKey: string,
  standards: SavedStandard[],
  curriculumTitle: string,
) {
  let totalKsas = 0;

  for (const standard of standards) {
    const ksas = await generateKsasForStandard(
      apiKey,
      standard,
      curriculumTitle,
    );

    const rows = ksas.map((ksa, index) => ({
      standard_id: standard.id,
      ksa_type: ksa.ksa_type,
      title: ksa.title,
      description: ksa.description?.trim() || null,
      sort_order: index + 1,
    }));

    const { error } = await supabase.from("standard_ksas").insert(rows);
    if (error) throw new Error(error.message);
    totalKsas += rows.length;
  }

  return totalKsas;
}

async function generateKsasForStandard(
  apiKey: string,
  standard: SavedStandard,
  curriculumTitle: string,
) {
  const messages = [
    {
      role: "system" as const,
      content: buildKsaGenerationInstruction({
        title: standard.title,
        domain_title: standard.domain_title,
        curriculum_title: curriculumTitle,
      }),
    },
    {
      role: "user" as const,
      content: `Generate KSAs for standard "${standard.title}".`,
    },
  ];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callLlm(apiKey, messages, {
      temperature: attempt === 0 ? 0.4 : 0.2,
      maxTokens: 2048,
    });

    const { ksas } = extractProposedKsas(result.content);
    if (ksas?.length) {
      return ksas;
    }
  }

  throw new Error(
    `Could not generate KSAs for "${standard.title}". The assistant response did not include valid ${PROPOSED_KSAS_MARKER} JSON.`,
  );
}

async function generateFirstWeekLessons(
  supabase: SupabaseClient,
  apiKey: string,
  userId: string,
  studentId: string,
  standards: SavedStandard[],
  curriculumTitle: string,
  settings: LessonPlannerSettings,
) {
  const standardsPayload: Array<{
    standard_id: string;
    standard_title: string;
    curriculum_id: string;
    curriculum_title: string;
    ksas: Array<{ ksa_type: string; title: string; description: string | null }>;
  }> = [];

  for (const standard of standards) {
    const { data: ksas } = await supabase
      .from("standard_ksas")
      .select("ksa_type, title, description")
      .eq("standard_id", standard.id)
      .order("sort_order", { ascending: true });

    standardsPayload.push({
      standard_id: standard.id,
      standard_title: standard.title,
      curriculum_id: standard.curriculum_id,
      curriculum_title: curriculumTitle,
      ksas: ksas ?? [],
    });
  }

  const plannerConstraints = `${formatPlannerConstraints(settings)} Schedule only within the first 7 calendar days.`;

  const standardsText = standardsPayload
    .map(
      (standard) => `Standard: ${standard.standard_title}
Standard ID: ${standard.standard_id}
Curriculum ID: ${standard.curriculum_id}
KSAs:
${standard.ksas
  .map(
    (ksa) =>
      `- ${ksa.ksa_type}: ${ksa.title}${ksa.description ? ` (${ksa.description})` : ""}`,
  )
  .join("\n")}`,
    )
    .join("\n\n");

  const result = await callLlm(apiKey, [
    {
      role: "system",
      content: [
        "You are a MicroSchool lesson-planning assistant.",
        buildProposedLessonsInstruction({
          plannerConstraints,
          standardCount: standardsPayload.length,
        }),
      ].join("\n\n"),
    },
    {
      role: "user",
      content: `Create the first week's lesson plan(s) for student ${studentId}:\n\n${standardsText}`,
    },
  ]);

  const { proposed } = extractProposedLessons(result.content);
  if (!proposed?.lessons?.length) {
    throw new Error("Could not generate first-week lesson plans.");
  }

  const now = new Date();
  const occupiedEvents = await fetchCalendarEvents(supabase, {
    start: startOfDay(now),
    end: endOfDay(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
    studentIds: [studentId],
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
    maxDays: 7,
  });

  const lessons: ProposedLesson[] = proposed.lessons.map((lesson, index) => {
    const slot = slots[index];
    const sourceStandard = standardsPayload[index] ?? standardsPayload[0];

    return {
      client_id: `week1-${index}`,
      standard_id: lesson.standard_id ?? sourceStandard.standard_id,
      standard_title: lesson.standard_title ?? sourceStandard.standard_title,
      curriculum_id: lesson.curriculum_id ?? sourceStandard.curriculum_id,
      curriculum_title: lesson.curriculum_title ?? curriculumTitle,
      title: lesson.title,
      summary: lesson.summary,
      content: lesson.content,
      activities: lesson.activities,
      scheduled_starts_at: slot?.starts_at.toISOString(),
      scheduled_ends_at: slot?.ends_at.toISOString(),
    };
  });

  const savedEvents: CalendarEventDisplay[] = [];

  for (const lesson of lessons) {
    if (!lesson.scheduled_starts_at || !lesson.scheduled_ends_at) continue;

    const { data: lessonRow, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        managed_by_user_id: userId,
        student_id: studentId,
        curriculum_id: lesson.curriculum_id ?? null,
        standard_id: lesson.standard_id ?? null,
        title: lesson.title,
        summary: lesson.summary?.trim() || null,
        content: lesson.content?.trim() || null,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (lessonError) throw new Error(lessonError.message);

    if (lesson.activities.length > 0) {
      const { error: activitiesError } = await supabase.from("lesson_activities").insert(
        lesson.activities.map((activity, activityIndex) => ({
          lesson_id: lessonRow.id,
          activity_type: activity.activity_type,
          title: activity.title,
          description: activity.description?.trim() || null,
          duration_minutes: activity.duration_minutes ?? null,
          resources: activity.resources ?? {},
          sort_order: activityIndex,
        })),
      );

      if (activitiesError) throw new Error(activitiesError.message);
    }

    const { data: eventRow, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        managed_by_user_id: userId,
        student_id: studentId,
        lesson_id: lessonRow.id,
        event_type: "lesson",
        title: lesson.title,
        description: lesson.summary?.trim() || null,
        starts_at: lesson.scheduled_starts_at,
        ends_at: lesson.scheduled_ends_at,
        is_all_day: false,
      })
      .select("id")
      .single();

    if (eventError) throw new Error(eventError.message);

    const { data: displayRow, error: displayError } = await supabase
      .from("calendar_events_display")
      .select("*")
      .eq("id", eventRow.id)
      .single();

    if (displayError) throw new Error(displayError.message);
    savedEvents.push(normalizeEvent(displayRow));
  }

  return savedEvents;
}

export async function buildCurriculumFromChat(options: {
  supabase: SupabaseClient;
  userId: string;
  studentId: string;
  proposedCurriculum: ProposedCurriculum;
  settings: LessonPlannerSettings;
  apiKey: string;
}): Promise<BuildFromChatResult> {
  const saved = await saveProposedCurriculum(
    options.supabase,
    options.userId,
    options.studentId,
    options.proposedCurriculum,
  );

  const ksasCount = await generateAndSaveKsas(
    options.supabase,
    options.apiKey,
    saved.standards,
    saved.curriculumTitle,
  );

  const events = await generateFirstWeekLessons(
    options.supabase,
    options.apiKey,
    options.userId,
    options.studentId,
    saved.standards,
    saved.curriculumTitle,
    options.settings,
  );

  const curriculumDetail = await fetchCurriculumDetail(
    options.supabase,
    saved.curriculumId,
  );

  if (!curriculumDetail) {
    throw new Error("Saved curriculum could not be loaded.");
  }

  return {
    curriculumId: saved.curriculumId,
    curriculumTitle: saved.curriculumTitle,
    standardsCount: saved.standards.length,
    ksasCount,
    lessonsCount: events.length,
    events,
    curriculumDetail,
  };
}
