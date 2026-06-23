"use client";

import type { CurriculumDetail } from "@/types/curriculum";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { resolveActiveStudentId } from "@/lib/students/access";
import type { StudentSafe } from "@/types/profile";

const KSA_LABELS = {
  knowledge: "Knowledge",
  skill: "Skill",
  ability: "Ability",
} as const;

type CurriculumDetailViewProps = {
  curriculum: CurriculumDetail;
  students: StudentSafe[];
  onBack: () => void;
};

export function CurriculumDetailView({
  curriculum,
  students,
  onBack,
}: CurriculumDetailViewProps) {
  const { currentTopic, selectTopic } = useCurrentTopic();
  const { settings } = useLessonPlanner();

  const activeStudentId = resolveActiveStudentId(
    students,
    settings.selected_student_ids,
    currentTopic?.studentId,
  );

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          ← All curricula
        </button>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">
          {curriculum.title}
        </h2>
        {curriculum.description ? (
          <p className="mt-2 text-sm leading-7 text-muted">
            {curriculum.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-6">
        {curriculum.domains.map((domain) => (
          <section key={domain.title} className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              {domain.title}
            </h3>
            <ul className="space-y-2">
              {domain.learning_standards.map((standard) => {
                const isSelected = currentTopic?.standardId === standard.id;

                return (
                  <li key={standard.id}>
                    <button
                      type="button"
                      disabled={!activeStudentId}
                      onClick={() => {
                        if (!activeStudentId) return;
                        void selectTopic({
                          standardId: standard.id,
                          standardTitle: standard.title,
                          domainTitle: standard.domain_title,
                          curriculumTitle: curriculum.title,
                          curriculumId: curriculum.id,
                          studentId: activeStudentId,
                        });
                      }}
                      className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-accent bg-accent-soft font-medium text-foreground ring-1 ring-accent"
                          : "border-border bg-surface text-foreground hover:border-accent hover:bg-accent-soft/50"
                      }`}
                    >
                      <span>{standard.title}</span>
                      {isSelected && standard.ksas.length > 0 ? (
                        <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                          {standard.ksas.map((ksa) => (
                            <li
                              key={ksa.id}
                              className="rounded-md bg-background/80 px-3 py-2 text-xs"
                            >
                              <span className="font-semibold text-accent">
                                {KSA_LABELS[ksa.ksa_type]}:
                              </span>{" "}
                              <span className="text-foreground">{ksa.title}</span>
                              {ksa.description ? (
                                <p className="mt-1 text-muted">{ksa.description}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
