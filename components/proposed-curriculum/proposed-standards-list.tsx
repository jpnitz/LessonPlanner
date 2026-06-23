"use client";

import { groupProposedStandardsByDomain } from "@/lib/curriculum/group-standards-by-domain";
import type { ProposedCurriculum } from "@/types/curriculum";

type ProposedStandardsListProps = {
  curriculum: ProposedCurriculum;
};

export function ProposedStandardsList({ curriculum }: ProposedStandardsListProps) {
  const domainGroups = groupProposedStandardsByDomain(curriculum.standards);

  return (
    <div className="space-y-4">
      {domainGroups.map((group) => (
        <section key={group.domainTitle} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">
            {group.domainTitle}
          </h4>
          <ul className="space-y-2">
            {group.standards.map((standard, index) => (
              <li
                key={`${group.domainTitle}-${standard.title}-${index}`}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">{standard.title}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
