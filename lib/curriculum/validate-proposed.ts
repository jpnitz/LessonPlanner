import type { ProposedCurriculum, ProposedStandard } from "@/types/curriculum";

export type ValidateProposedCurriculumResult =
  | { ok: true; curriculum: ProposedCurriculum }
  | { ok: false; error: string };

function normalizeStandard(raw: unknown): ProposedStandard | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const title =
    typeof record.title === "string" ? record.title.trim() : "";
  if (!title) return null;

  const domainTitle =
    typeof record.domain_title === "string" && record.domain_title.trim()
      ? record.domain_title.trim()
      : undefined;

  return domainTitle ? { title, domain_title: domainTitle } : { title };
}

export function validateAndNormalizeProposedCurriculum(
  raw: unknown,
): ValidateProposedCurriculumResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Proposed curriculum must be a JSON object." };
  }

  const record = raw as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!title) {
    return {
      ok: false,
      error: "Proposed curriculum must include a non-empty title.",
    };
  }

  if (!Array.isArray(record.standards)) {
    return {
      ok: false,
      error: "Proposed curriculum must include a standards array.",
    };
  }

  const standards = record.standards
    .map(normalizeStandard)
    .filter((standard): standard is ProposedStandard => standard !== null);

  if (standards.length === 0) {
    return {
      ok: false,
      error: "Proposed curriculum must include at least one valid standard title.",
    };
  }

  const description =
    typeof record.description === "string" && record.description.trim()
      ? record.description.trim()
      : undefined;

  return {
    ok: true,
    curriculum: {
      title,
      ...(description ? { description } : {}),
      standards,
    },
  };
}
