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
        ksas: Array<{
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
  return `When you have gathered enough information about the learner's prior knowledge, propose learning standards.
Append a single line starting with exactly "${PROPOSED_STANDARDS_MARKER}" followed by JSON (no markdown fences) in this shape:
{"title":"Subject name","description":"Optional summary","standards":[{"title":"Standard title","domain_title":"Optional domain","ksas":[{"ksa_type":"knowledge","title":"...","description":"..."},{"ksa_type":"skill","title":"..."},{"ksa_type":"ability","title":"..."}]}]}
Do not include the JSON block until you are ready to propose standards.`;
}

export { PROPOSED_STANDARDS_MARKER };
