"use client";

import { useRef, useState } from "react";
import type { StudentSafe } from "@/types/profile";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { LessonPlannerOptions } from "@/components/menu/lesson-planner-options";
import { AiChatWindow } from "@/components/menu/ai-chat-window";

type MenuPaneProps = {
  students: StudentSafe[];
};

export function MenuPane({ students }: MenuPaneProps) {
  const { currentTopic } = useCurrentTopic();
  const [chatDraft, setChatDraft] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const chatActionsRef = useRef<{ createCurriculum: () => Promise<void> } | null>(
    null,
  );

  async function handleCreateCurriculum() {
    if (!chatDraft.trim() || !chatActionsRef.current) return;
    setIsCreating(true);
    try {
      await chatActionsRef.current.createCurriculum();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <p className="text-base font-semibold text-foreground">Menu</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Current topic
        </p>
        {currentTopic ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {currentTopic.standardTitle}
            </p>
            <p className="text-xs text-muted">
              {currentTopic.curriculumTitle}
              {currentTopic.domainTitle ? ` · ${currentTopic.domainTitle}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No topic selected. Open Curriculum and choose a learning standard.
          </p>
        )}
      </div>

      <LessonPlannerOptions
        students={students}
        chatDraft={chatDraft}
        onCreateCurriculum={handleCreateCurriculum}
        isCreating={isCreating}
      />

      <AiChatWindow
        draft={chatDraft}
        onDraftChange={setChatDraft}
        onRegisterActions={(actions) => {
          chatActionsRef.current = actions;
        }}
      />
    </div>
  );
}
