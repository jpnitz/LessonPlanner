import type { ProposedStandard } from "@/types/curriculum";

export type ProposedStandardsDomainGroup = {
  domainTitle: string;
  standards: ProposedStandard[];
};

export function groupProposedStandardsByDomain(
  standards: ProposedStandard[],
): ProposedStandardsDomainGroup[] {
  const groups = new Map<string, ProposedStandard[]>();

  for (const standard of standards) {
    const domainTitle = standard.domain_title?.trim() || "General";
    const existing = groups.get(domainTitle) ?? [];
    existing.push(standard);
    groups.set(domainTitle, existing);
  }

  return Array.from(groups.entries()).map(([domainTitle, domainStandards]) => ({
    domainTitle,
    standards: domainStandards,
  }));
}
