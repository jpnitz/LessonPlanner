"use client";

import type { CurriculumDetail } from "@/types/curriculum";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";

type CurriculumDetailViewProps = {
  curriculum: CurriculumDetail;
  onBack: () => void;
};

export function CurriculumDetailView({
  curriculum,
  onBack,
}: CurriculumDetailViewProps) {
  const { currentTopic, selectTopic } = useCurrentTopic();

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
        {curriculum.sections.map((section) => (
          <section key={section.id} className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.learning_standards.map((standard) => {
                const isSelected = currentTopic?.standardId === standard.id;

                return (
                  <li key={standard.id}>
                    <button
                      type="button"
                      onClick={() =>
                        selectTopic({
                          standardId: standard.id,
                          standardTitle: standard.title,
                          sectionTitle: section.title,
                          curriculumTitle: curriculum.title,
                          curriculumId: curriculum.id,
                        })
                      }
                      className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-accent bg-accent-soft font-medium text-foreground ring-1 ring-accent"
                          : "border-border bg-surface text-foreground hover:border-accent hover:bg-accent-soft/50"
                      }`}
                    >
                      {standard.title}
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
