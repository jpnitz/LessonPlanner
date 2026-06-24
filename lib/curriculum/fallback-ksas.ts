import type { ProposedStandardKsa } from "@/types/curriculum";

export function buildFallbackKsas(standardTitle: string): ProposedStandardKsa[] {
  return [
    {
      ksa_type: "knowledge",
      title: `Explain the core concepts behind: ${standardTitle}`,
      description:
        "Foundational vocabulary and ideas needed before practicing this standard.",
    },
    {
      ksa_type: "skill",
      title: `Practice procedures for: ${standardTitle}`,
      description:
        "Hands-on exercises that build competence with this standard.",
    },
    {
      ksa_type: "ability",
      title: `Apply and evaluate approaches related to: ${standardTitle}`,
      description:
        "Transfer learning to new situations and justify chosen methods.",
    },
  ];
}
