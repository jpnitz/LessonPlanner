import { createAdminClient } from "@/lib/supabase/admin";
import { validateAndNormalizeProposedCurriculum } from "@/lib/curriculum/validate-proposed";
import { parseJsonAfterMarker } from "@/lib/llm/json-extract";
import {
  PROPOSED_KSAS_MARKER,
  PROPOSED_LESSONS_MARKER,
  PROPOSED_STANDARDS_MARKER,
} from "@/lib/llm/markers";

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
  options?: { temperature?: number; maxTokens?: number },
): Promise<LlmCompletionResult> {
  const baseUrl =
    process.env.OPENAI_API_BASE_URL?.replace(/\/$/, "") ??
    "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const temperature = options?.temperature ?? 0.7;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
  };

  if (options?.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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

export function extractProposedCurriculum(content: string) {
  const { jsonObject, visibleContent } = parseJsonAfterMarker(
    content,
    PROPOSED_STANDARDS_MARKER,
  );

  if (!jsonObject) {
    return { visibleContent: content, proposed: null, parseError: null };
  }

  try {
    const parsed = JSON.parse(jsonObject) as unknown;
    const validated = validateAndNormalizeProposedCurriculum(parsed);

    if (!validated.ok) {
      return {
        visibleContent,
        proposed: null,
        parseError: validated.error,
      };
    }

    return {
      visibleContent,
      proposed: validated.curriculum,
      parseError: null,
    };
  } catch {
    return {
      visibleContent,
      proposed: null,
      parseError:
        "Standards were proposed but the JSON block could not be parsed. Ask the assistant to re-send the JSON block.",
    };
  }
}

export function buildProposedStandardsInstruction() {
  return `When you have gathered enough information about the learner's prior knowledge, propose learning standards (titles and optional domain groupings only — KSAs will be generated separately later).
Append a single line starting with exactly "${PROPOSED_STANDARDS_MARKER}" followed by JSON (no markdown fences) in this shape:
{"title":"Subject name","description":"Optional summary","standards":[{"title":"Standard title","domain_title":"Optional domain"}]}
Do not include the JSON block until you are ready to propose standards.`;
}

export { PROPOSED_STANDARDS_MARKER, PROPOSED_LESSONS_MARKER, PROPOSED_KSAS_MARKER };

const VALID_ACTIVITY_TYPES = new Set([
  "video",
  "web_activity",
  "computer_challenge",
  "worksheet",
  "home_activity",
  "community_activity",
  "thought_experiment",
]);

const VALID_KSA_TYPES = new Set(["knowledge", "skill", "ability"]);

function normalizeKsaType(value: string) {
  const normalized = value.trim().toLowerCase();
  return VALID_KSA_TYPES.has(normalized)
    ? (normalized as "knowledge" | "skill" | "ability")
    : null;
}

export function extractProposedLessons(content: string) {
  const { jsonObject, visibleContent } = parseJsonAfterMarker(
    content,
    PROPOSED_LESSONS_MARKER,
  );

  if (!jsonObject) {
    return { visibleContent: content, proposed: null };
  }

  try {
    const parsed = JSON.parse(jsonObject) as {
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
    return { visibleContent, proposed: null };
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

export function extractProposedKsas(content: string) {
  const { jsonObject, visibleContent } = parseJsonAfterMarker(
    content,
    PROPOSED_KSAS_MARKER,
  );

  if (!jsonObject) {
    return { visibleContent: content, ksas: null };
  }

  try {
    const parsed = JSON.parse(jsonObject) as {
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
      .map((ksa) => {
        const ksaType = normalizeKsaType(ksa.ksa_type ?? "");
        if (!ksaType || !ksa.title?.trim()) return null;
        return {
          ksa_type: ksaType,
          title: ksa.title.trim(),
          description: ksa.description?.trim() || undefined,
        };
      })
      .filter((ksa): ksa is NonNullable<typeof ksa> => ksa !== null);

    return { visibleContent, ksas: ksas.length > 0 ? ksas : null };
  } catch {
    return { visibleContent, ksas: null };
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
Use ksa_type values exactly: knowledge, skill, ability (all lowercase).
Append a single line starting with exactly "${PROPOSED_KSAS_MARKER}" followed by compact JSON (no markdown fences, no text after the closing brace):
{"ksas":[{"ksa_type":"knowledge","title":"...","description":"..."},{"ksa_type":"skill","title":"...","description":"..."},{"ksa_type":"ability","title":"...","description":"..."}]}`;
}
