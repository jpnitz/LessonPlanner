"use client";

import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { ProposedStandardsList } from "@/components/proposed-curriculum/proposed-standards-list";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { resolveActiveStudentId } from "@/lib/students/access";
import { Button } from "@/components/ui/button";
import type { StudentSafe } from "@/types/profile";

type ProposedCurriculumPaneProps = {
  students: StudentSafe[];
};

export function ProposedCurriculumPane({ students }: ProposedCurriculumPaneProps) {
  const { proposedCurriculum, proposedCurriculumError } = useProposedCurriculum();
  const { openChat, openCurriculum } = useMainPane();
  const { settings } = useLessonPlanner();
  const { currentTopic } = useCurrentTopic();

  const activeStudentId = resolveActiveStudentId(
    students,
    settings.selected_student_ids,
    currentTopic?.studentId,
  );

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
          Review the proposed learning standards below. Use the AI chat view to
          save standards, generate KSAs, and schedule the first week.
        </p>
        {proposedCurriculumError ? (
          <p className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {proposedCurriculumError}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={openChat}>
            Open AI chat & save plan
          </Button>
          {!activeStudentId ? (
            <p className="self-center text-xs text-danger">
              Select a student in Menu → Lesson Planner Options first.
            </p>
          ) : null}
        </div>
      </div>

      <ProposedStandardsList curriculum={proposedCurriculum} />

      <Button type="button" variant="secondary" onClick={openCurriculum}>
        Back to Curriculum
      </Button>
    </div>
  );
}
