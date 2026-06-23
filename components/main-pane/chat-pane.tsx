"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProposedCurriculum } from "@/types/curriculum";
import { useMenuChat } from "@/components/menu/menu-chat-context";
import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { resolveActiveStudentId } from "@/lib/students/access";
import type { StudentSafe } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { ProposedStandardsList } from "@/components/proposed-curriculum/proposed-standards-list";

type ChatPaneProps = {
  students: StudentSafe[];
};

export function ChatPane({ students }: ChatPaneProps) {
  const router = useRouter();
  const { messages } = useMenuChat();
  const {
    proposedCurriculum,
    proposedCurriculumError,
    clearProposedCurriculum,
  } = useProposedCurriculum();
  const { settings } = useLessonPlanner();
  const { currentTopic } = useCurrentTopic();
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeStudentId = resolveActiveStudentId(
    students,
    settings.selected_student_ids,
    currentTopic?.studentId,
  );

  async function handleBuildPlan(curriculum: ProposedCurriculum) {
    if (!activeStudentId) {
      setError("Select a student in Menu → Lesson Planner Options first.");
      return;
    }

    setIsBuilding(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/curriculum/build-from-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: activeStudentId,
          proposedCurriculum: curriculum,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 422 && data.error === "missing_api_key") {
        throw new Error(
          data.message ??
            "Add OPENAI_API_KEY to .env.local, or add a per-student key in Profile.",
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not save curriculum plan. Run migration 007 in Supabase if you have not yet.",
        );
      }

      const { result } = data;
      setSuccess(
        `Saved ${result.standardsCount} standard(s), generated ${result.ksasCount} KSA(s), and scheduled ${result.lessonsCount} lesson(s) for the first week.`,
      );
      clearProposedCurriculum();
      router.refresh();
    } catch (buildError) {
      setError(
        buildError instanceof Error
          ? buildError.message
          : "Could not build curriculum plan.",
      );
    } finally {
      setIsBuilding(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">AI chat</h2>
        <p className="mt-2 text-sm text-muted">
          Conversation from the Menu pane is mirrored here. When the assistant
          proposes standards, save them to the database to generate KSAs and
          schedule the first week of lessons.
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

      {proposedCurriculum ? (
        <section className="space-y-4 rounded-lg border border-accent/40 bg-accent-soft/30 p-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Proposed standards: {proposedCurriculum.title}
            </h3>
            {proposedCurriculum.description ? (
              <p className="mt-1 text-sm text-muted">
                {proposedCurriculum.description}
              </p>
            ) : null}
          </div>

          <ProposedStandardsList curriculum={proposedCurriculum} />

          <p className="text-xs text-muted">
            Saving will: (1) write standards to the database, (2) ask the LLM to
            generate KSAs for each standard, (3) create the first week&apos;s
            lessons on the calendar using your planner options.
          </p>

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

          <Button
            type="button"
            disabled={isBuilding || !activeStudentId}
            onClick={() => void handleBuildPlan(proposedCurriculum)}
          >
            {isBuilding
              ? "Saving standards, generating KSAs & scheduling…"
              : "Save standards, generate KSAs & schedule first week"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
