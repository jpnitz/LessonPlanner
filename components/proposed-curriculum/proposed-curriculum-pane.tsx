"use client";

import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { ProposedStandardsList } from "@/components/proposed-curriculum/proposed-standards-list";
import { useApproveProposedCurriculum } from "@/components/proposed-curriculum/use-approve-proposed-curriculum";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { Button } from "@/components/ui/button";
import type { StudentSafe } from "@/types/profile";

type ProposedCurriculumPaneProps = {
  students: StudentSafe[];
};

export function ProposedCurriculumPane({ students }: ProposedCurriculumPaneProps) {
  const { proposedCurriculum, proposedCurriculumError } = useProposedCurriculum();
  const { openHome, openCurriculum } = useMainPane();
  const { settings } = useLessonPlanner();
  const { currentTopic } = useCurrentTopic();
  const {
    activeStudentId,
    approveProposedCurriculum,
    isBuilding,
    error,
    success,
  } = useApproveProposedCurriculum({
    students,
    selectedStudentIds: settings.selected_student_ids,
    currentTopicStudentId: currentTopic?.studentId,
  });

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
          Review the proposed learning standards below, then approve them to save
          to the curriculum database.
        </p>
        {proposedCurriculumError ? (
          <p className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {proposedCurriculumError}
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          <Button
            type="button"
            disabled={isBuilding || !activeStudentId}
            onClick={() => void approveProposedCurriculum(proposedCurriculum)}
          >
            {isBuilding
              ? "Approving standards and saving to curriculum…"
              : "Approve proposed standards"}
          </Button>
          {!activeStudentId ? (
            <p className="text-xs text-danger">
              Select a student in Menu → Lesson Planner Options first.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md bg-accent-soft px-2 py-1.5 text-xs text-foreground">
              {success}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={openHome}>
              Create Curriculum
            </Button>
            <Button type="button" variant="secondary" onClick={openCurriculum}>
              Browse curriculum
            </Button>
          </div>
        </div>
      </div>

      <ProposedStandardsList curriculum={proposedCurriculum} />
    </div>
  );
}
