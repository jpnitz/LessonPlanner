"use client";

import { useEffect, useRef, useState } from "react";
import type { StudentSafe } from "@/types/profile";
import { CompleteProfileBanner } from "@/components/profile/complete-profile-banner";
import { useAiChatController } from "@/components/menu/use-ai-chat-controller";
import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { useApproveProposedCurriculum } from "@/components/proposed-curriculum/use-approve-proposed-curriculum";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { ProposedStandardsList } from "@/components/proposed-curriculum/proposed-standards-list";
import { Button } from "@/components/ui/button";

const CREATE_PLACEHOLDER =
  "Welcome to Microschool Curriculum Creator. 1. Set your user options in the menu bar on the left, 2. type here what subject you would like to learn about (be as specific as possible), and 3. click the create new curriculum. If I have any questions, I'll ask. Then wait, it may take a while for me to think about your request.";

type CreateCurriculumPaneProps = {
  students: StudentSafe[];
  showProfileIncompleteBanner: boolean;
};

export function CreateCurriculumPane({
  students,
  showProfileIncompleteBanner,
}: CreateCurriculumPaneProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { settings } = useLessonPlanner();
  const { currentTopic } = useCurrentTopic();
  const { proposedCurriculum } = useProposedCurriculum();

  const {
    messages,
    chatMode,
    isSending,
    error,
    missingKeyHelp,
    proposedCurriculumError,
    sendChat,
    handleResetChat,
  } = useAiChatController();

  const {
    activeStudentId,
    approveProposedCurriculum,
    isBuilding,
    error: approveError,
    success,
  } = useApproveProposedCurriculum({
    students,
    selectedStudentIds: settings.selected_student_ids,
    currentTopicStudentId: currentTopic?.studentId,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, proposedCurriculum]);

  const inCreateFlow =
    chatMode === "create_curriculum" || messages.some((message) => message.role === "user");

  const primaryLabel =
    chatMode === "create_curriculum" ? "Reply" : "Create new curriculum";

  function handlePrimaryAction() {
    void sendChat(
      "create_curriculum",
      draft,
      () => setDraft(""),
      (value) => setDraft(value),
    );
  }

  function handleReset() {
    handleResetChat();
    setDraft("");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <CompleteProfileBanner show={showProfileIncompleteBanner} />

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Describe the subject you want to learn. The assistant will ask follow-up
            questions if needed, then propose learning standards for your approval.
          </p>
        ) : (
          <div ref={scrollRef} className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
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
            ))}
          </div>
        )}
        {isSending ? (
          <p className="text-xs text-muted">Assistant is thinking…</p>
        ) : null}
      </section>

      {proposedCurriculumError ? (
        <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {proposedCurriculumError}
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
                Select a student in the menu on the left first.
              </p>
            ) : null}

            {approveError ? (
              <p className="rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
                {approveError}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-md bg-accent-soft px-2 py-1.5 text-xs text-foreground">
                {success}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              {proposedCurriculum.title}
            </h3>
            {proposedCurriculum.description ? (
              <p className="mt-1 text-sm text-muted">{proposedCurriculum.description}</p>
            ) : null}
          </div>

          <ProposedStandardsList curriculum={proposedCurriculum} />
        </section>
      ) : null}

      {missingKeyHelp ? (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {missingKeyHelp}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={5}
          placeholder={CREATE_PLACEHOLDER}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={isSending || !draft.trim()}
            onClick={handlePrimaryAction}
          >
            {primaryLabel}
          </Button>
          {inCreateFlow ? (
            <Button type="button" variant="secondary" onClick={handleReset}>
              Reset chat
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
