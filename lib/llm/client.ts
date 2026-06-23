import { createAdminClient } from "@/lib/supabase/admin";

export async function getStudentLlmApiKey(
  studentId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("student_secrets")
    .select("llm_api_key")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data?.llm_api_key) return null;
  return data.llm_api_key;
}

/** Student key first; falls back to server OPENAI_API_KEY in .env.local */
export async function resolveLlmApiKey(
  studentId: string,
): Promise<{ key: string; source: "student" | "default" } | null> {
  const studentKey = await getStudentLlmApiKey(studentId);
  if (studentKey) {
    return { key: studentKey, source: "student" };
  }

  const defaultKey = process.env.OPENAI_API_KEY?.trim();
  if (defaultKey) {
    return { key: defaultKey, source: "default" };
  }

  return null;
}

export function isDefaultLlmConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmCompletionResult = {
  content: string;
};

export async function callLlm(
  apiKey: string,
  messages: LlmMessage[],
): Promise<LlmCompletionResult> {
  const baseUrl =
    process.env.OPENAI_API_BASE_URL?.replace(/\/$/, "") ??
    "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM returned an empty response.");
  }

  return { content };
}

const PROPOSED_STANDARDS_MARKER = "PROPOSED_STANDARDS_JSON:";

export function extractProposedCurriculum(content: string) {
  const markerIndex = content.indexOf(PROPOSED_STANDARDS_MARKER);
  if (markerIndex === -1) {
    return { visibleContent: content, proposed: null };
  }

  const visibleContent = content.slice(0, markerIndex).trim();
  const jsonPart = content
    .slice(markerIndex + PROPOSED_STANDARDS_MARKER.length)
    .trim();

  try {
    const proposed = JSON.parse(jsonPart) as {
      title: string;
      description?: string;
      standards: Array<{
        title: string;
        domain_title?: string;
        ksas?: Array<{
          ksa_type: "knowledge" | "skill" | "ability";
          title: string;
          description?: string;
        }>;
      }>;
    };
    return { visibleContent, proposed };
  } catch {
    return { visibleContent: content, proposed: null };
  }
}

export function buildProposedStandardsInstruction() {
  return `When you have gathered enough information about the learner's prior knowledge, propose learning standards (titles and optional domain groupings only — KSAs will be generated separately later).
Append a single line starting with exactly "${PROPOSED_STANDARDS_MARKER}" followed by JSON (no markdown fences) in this shape:
{"title":"Subject name","description":"Optional summary","standards":[{"title":"Standard title","domain_title":"Optional domain"}]}
Do not include the JSON block until you are ready to propose standards.`;
}

export { PROPOSED_STANDARDS_MARKER };

const PROPOSED_LESSONS_MARKER = "PROPOSED_LESSONS_JSON:";

const VALID_ACTIVITY_TYPES = new Set([
  "video",
  "web_activity",
  "computer_challenge",
  "worksheet",
  "home_activity",
  "community_activity",
  "thought_experiment",
]);

export function extractProposedLessons(content: string) {
  const markerIndex = content.indexOf(PROPOSED_LESSONS_MARKER);
  if (markerIndex === -1) {
    return { visibleContent: content, proposed: null };
  }

  const visibleContent = content.slice(0, markerIndex).trim();
  const jsonPart = content
    .slice(markerIndex + PROPOSED_LESSONS_MARKER.length)
    .trim();

  try {
    const parsed = JSON.parse(jsonPart) as {
      lessons?: Array<{
        standard_title: string;
        standard_id?: string | null;
        curriculum_id?: string | null;
        curriculum_title?: string | null;
        title: string;
        summary?: string;
        content?: string;
        activities?: Array<{
          activity_type: string;
          title: string;
          description?: string;
          duration_minutes?: number;
          resources?: { url?: string; notes?: string };
        }>;
      }>;
    };

    if (!Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
      return { visibleContent, proposed: null };
    }

    const lessons = parsed.lessons
      .filter((lesson) => lesson.title && lesson.standard_title)
      .map((lesson, index) => ({
        client_id: `draft-${index}-${Date.now()}`,
        standard_id: lesson.standard_id ?? null,
        standard_title: lesson.standard_title,
        curriculum_id: lesson.curriculum_id ?? null,
        curriculum_title: lesson.curriculum_title ?? null,
        title: lesson.title,
        summary: lesson.summary ?? "",
        content: lesson.content ?? "",
        activities: (lesson.activities ?? [])
          .filter(
            (activity) =>
              activity.title &&
              VALID_ACTIVITY_TYPES.has(activity.activity_type),
          )
          .map((activity) => ({
            activity_type: activity.activity_type as
              | "video"
              | "web_activity"
              | "computer_challenge"
              | "worksheet"
              | "home_activity"
              | "community_activity"
              | "thought_experiment",
            title: activity.title,
            description: activity.description,
            duration_minutes: activity.duration_minutes,
            resources: activity.resources,
          })),
      }));

    if (lessons.length === 0) {
      return { visibleContent, proposed: null };
    }

    return { visibleContent, proposed: { lessons } };
  } catch {
    return { visibleContent: content, proposed: null };
  }
}

export function buildProposedLessonsInstruction(options: {
  plannerConstraints: string;
  standardCount: number;
}) {
  return `Generate ${options.standardCount} complete lesson plan(s) from the provided learning standards and KSAs.
Each lesson must include multiple activities using these activity_type values only:
video, web_activity, computer_challenge, worksheet, home_activity, community_activity, thought_experiment.
${options.plannerConstraints}
Append a single line starting with exactly "${PROPOSED_LESSONS_MARKER}" followed by JSON (no markdown fences) in this shape:
{"lessons":[{"standard_title":"...","standard_id":"optional uuid","curriculum_id":"optional uuid","curriculum_title":"optional","title":"Lesson title","summary":"Short summary","content":"Markdown overview for the parent/teacher","activities":[{"activity_type":"video","title":"...","description":"...","duration_minutes":20,"resources":{"url":"https://...","notes":"..."}}]}]}
Do not include the JSON block until the lesson plans are complete.`;
}

export { PROPOSED_LESSONS_MARKER };

const PROPOSED_KSAS_MARKER = "PROPOSED_KSAS_JSON:";

export function extractProposedKsas(content: string) {
  const markerIndex = content.indexOf(PROPOSED_KSAS_MARKER);
  if (markerIndex === -1) {
    return { visibleContent: content, ksas: null };
  }

  const visibleContent = content.slice(0, markerIndex).trim();
  const jsonPart = content.slice(markerIndex + PROPOSED_KSAS_MARKER.length).trim();

  try {
    const parsed = JSON.parse(jsonPart) as {
      ksas?: Array<{
        ksa_type: string;
        title: string;
        description?: string;
      }>;
    };

    if (!Array.isArray(parsed.ksas) || parsed.ksas.length === 0) {
      return { visibleContent, ksas: null };
    }

    const ksas = parsed.ksas
      .filter(
        (ksa) =>
          ksa.title &&
          ["knowledge", "skill", "ability"].includes(ksa.ksa_type),
      )
      .map((ksa) => ({
        ksa_type: ksa.ksa_type as "knowledge" | "skill" | "ability",
        title: ksa.title,
        description: ksa.description,
      }));

    return { visibleContent, ksas: ksas.length > 0 ? ksas : null };
  } catch {
    return { visibleContent: content, ksas: null };
  }
}

export function buildKsaGenerationInstruction(standard: {
  title: string;
  domain_title?: string | null;
  curriculum_title?: string | null;
}) {
  return `Generate Knowledge, Skill, and Ability (KSA) items for this learning standard.
Standard: ${standard.title}
Domain: ${standard.domain_title ?? "General"}
Curriculum: ${standard.curriculum_title ?? "Custom"}
Provide at least one knowledge, one skill, and one ability item.
Append a single line starting with exactly "${PROPOSED_KSAS_MARKER}" followed by JSON (no markdown fences):
{"ksas":[{"ksa_type":"knowledge","title":"...","description":"..."},{"ksa_type":"skill","title":"..."},{"ksa_type":"ability","title":"..."}]}`;
}

export { PROPOSED_KSAS_MARKER };
