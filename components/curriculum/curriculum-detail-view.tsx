"use client";

import type { CurriculumDetail } from "@/types/curriculum";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { resolveActiveStudentId } from "@/lib/students/access";
import { GenerateLessonsAction } from "@/components/lessons/generate-lessons-action";
import { DeleteCurriculumButton } from "@/components/curriculum/delete-curriculum-button";
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
  const { currentTopic, selectTopic, clearTopic } = useCurrentTopic();
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
        <p className="mt-2 text-xs text-muted">
          Click a standard to select it as the current topic. Click again to
          clear the selection.
        </p>
        {curriculum.is_user_owned ? (
          <div className="mt-4">
            <DeleteCurriculumButton
              curriculumId={curriculum.id}
              curriculumTitle={curriculum.title}
              onDeleted={onBack}
            />
          </div>
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
                    <div
                      className={`rounded-md border transition-colors ${
                        isSelected
                          ? "border-accent bg-accent-soft ring-1 ring-accent"
                          : "border-border bg-surface"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!activeStudentId}
                        onClick={() => {
                          if (!activeStudentId) return;
                          if (isSelected) {
                            void clearTopic();
                            return;
                          }
                          void selectTopic({
                            standardId: standard.id,
                            standardTitle: standard.title,
                            domainTitle: standard.domain_title,
                            curriculumTitle: curriculum.title,
                            curriculumId: curriculum.id,
                            studentId: activeStudentId,
                          });
                        }}
                        className={`w-full rounded-md px-4 py-3 text-left text-sm transition-colors disabled:opacity-50 ${
                          isSelected
                            ? "font-medium text-foreground"
                            : "text-foreground hover:bg-accent-soft/50"
                        }`}
                      >
                        {standard.title}
                        {isSelected ? (
                          <span className="mt-1 block text-xs font-normal text-muted">
                            Selected — click to clear
                          </span>
                        ) : null}
                      </button>

                      {isSelected ? (
                        <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3">
                          {standard.ksas.length > 0 ? (
                            <ul className="space-y-2">
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
                          ) : (
                            <p className="text-xs text-muted">
                              No KSAs yet — save a curriculum plan from chat to
                              generate them.
                            </p>
                          )}
                          {activeStudentId ? (
                            <GenerateLessonsAction
                              studentId={activeStudentId}
                              source="current_topic"
                              standardId={standard.id}
                              label="Generate lesson plan for this standard"
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
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
