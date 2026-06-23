"use client";

import { useMemo, useState } from "react";
import type { CurriculumDetail, CurriculumSummary } from "@/types/curriculum";
import type { StudentSafe } from "@/types/profile";
import { CurriculumList } from "@/components/curriculum/curriculum-list";
import { CurriculumDetailView } from "@/components/curriculum/curriculum-detail-view";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";

type CurriculumPaneProps = {
  curricula: CurriculumSummary[];
  curriculumDetails: CurriculumDetail[];
  students: StudentSafe[];
};

export function CurriculumPane({
  curricula,
  curriculumDetails,
  students,
}: CurriculumPaneProps) {
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | null>(
    null,
  );
  const { currentTopic } = useCurrentTopic();
  const { settings } = useLessonPlanner();

  const selectedCurriculum = useMemo(
    () =>
      selectedCurriculumId
        ? (curriculumDetails.find(
            (curriculum) => curriculum.id === selectedCurriculumId,
          ) ?? null)
        : null,
    [curriculumDetails, selectedCurriculumId],
  );

  if (selectedCurriculum) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {currentTopic ? (
          <div className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
            <span className="font-medium text-foreground">Selected topic: </span>
            <span className="text-foreground">{currentTopic.standardTitle}</span>
          </div>
        ) : null}
        <CurriculumDetailView
          curriculum={selectedCurriculum}
          students={students}
          onBack={() => setSelectedCurriculumId(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Curriculum</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Browse available curricula and select a learning standard to set your
          current topic.
        </p>
        {settings.selected_student_ids.length > 0 ? (
          <p className="mt-1 text-xs text-muted">
            Showing curricula assigned to selected students in the Menu pane.
          </p>
        ) : null}
      </div>
      {currentTopic ? (
        <div className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
          <span className="font-medium text-foreground">Current topic: </span>
          <span className="text-foreground">{currentTopic.standardTitle}</span>
        </div>
      ) : null}
      <CurriculumList
        curricula={curricula}
        onSelect={setSelectedCurriculumId}
      />
    </div>
  );
}
