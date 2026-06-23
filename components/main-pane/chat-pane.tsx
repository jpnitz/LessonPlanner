"use client";

import { useMenuChat } from "@/components/menu/menu-chat-context";
import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { useApproveProposedCurriculum } from "@/components/proposed-curriculum/use-approve-proposed-curriculum";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import type { StudentSafe } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { ProposedStandardsList } from "@/components/proposed-curriculum/proposed-standards-list";

type ChatPaneProps = {
  students: StudentSafe[];
};

export function ChatPane({ students }: ChatPaneProps) {
  const { messages, chatMode } = useMenuChat();
  const { proposedCurriculum, proposedCurriculumError } = useProposedCurriculum();
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">AI chat</h2>
        <p className="mt-2 text-sm text-muted">
          Conversation from the Menu pane is mirrored here. When the assistant
          proposes standards, review them below and approve to save them to the
          curriculum database.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Start a conversation in the Menu pane on the left.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-md px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-8 bg-accent-soft text-foreground"
                  : "mr-8 bg-surface-muted text-foreground"
              }`}
            >
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {message.role === "user" ? "You" : "Assistant"}
              </p>
              <div className="whitespace-pre-wrap leading-6">{message.content}</div>
            </div>
          ))
        )}
      </section>

      {proposedCurriculumError ? (
        <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {proposedCurriculumError}
        </p>
      ) : null}

      {chatMode === "create_curriculum" && !proposedCurriculum && !proposedCurriculumError ? (
        <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted">
          Continue the conversation in the Menu pane. When the assistant proposes
          standards, an Approve button will appear here.
        </p>
      ) : null}

      {proposedCurriculum ? (
        <section className="space-y-4 rounded-lg border border-accent/40 bg-accent-soft/30 p-4">
          <div className="space-y-3">
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

            <p className="text-xs text-muted">
              Approving will save standards to the database, generate KSAs for
              each standard, schedule the first week&apos;s lessons on the
              calendar, and open the curriculum view with your new standards.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              {proposedCurriculum.title}
            </h3>
            {proposedCurriculum.description ? (
              <p className="mt-1 text-sm text-muted">
                {proposedCurriculum.description}
              </p>
            ) : null}
          </div>

          <ProposedStandardsList curriculum={proposedCurriculum} />
        </section>
      ) : null}
    </div>
  );
}
