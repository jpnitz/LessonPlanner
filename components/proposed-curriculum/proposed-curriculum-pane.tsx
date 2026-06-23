"use client";

import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";

const KSA_LABELS = {
  knowledge: "Knowledge",
  skill: "Skill",
  ability: "Ability",
} as const;

export function ProposedCurriculumPane() {
  const { proposedCurriculum } = useProposedCurriculum();
  const { openCurriculum } = useMainPane();

  if (!proposedCurriculum) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        No proposed curriculum to display. Use Create new curriculum in the Menu
        pane after chatting with the assistant.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          {proposedCurriculum.title}
        </h2>
        {proposedCurriculum.description ? (
          <p className="mt-2 text-sm leading-7 text-muted">
            {proposedCurriculum.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted">
          Review the proposed learning standards below. Turning standards into
          scheduled lessons comes in Phase 6.
        </p>
      </div>

      <div className="space-y-6">
        {proposedCurriculum.standards.map((standard, index) => (
          <section
            key={`${standard.title}-${index}`}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <h3 className="text-base font-semibold text-foreground">
              {standard.title}
            </h3>
            {standard.domain_title ? (
              <p className="mt-1 text-xs text-muted">{standard.domain_title}</p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {standard.ksas.map((ksa, ksaIndex) => (
                <li
                  key={`${ksa.ksa_type}-${ksaIndex}`}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium text-accent">
                    {KSA_LABELS[ksa.ksa_type]}:
                  </span>{" "}
                  {ksa.title}
                  {ksa.description ? (
                    <p className="mt-1 text-xs text-muted">{ksa.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={openCurriculum}>
        Back to Curriculum
      </Button>
    </div>
  );
}
