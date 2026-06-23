"use client";

import { useRef, useState } from "react";
import type { StudentSafe } from "@/types/profile";
import { LessonPlannerOptions } from "@/components/menu/lesson-planner-options";
import { AiChatWindow } from "@/components/menu/ai-chat-window";

type MenuPaneProps = {
  students: StudentSafe[];
};

export function MenuPane({ students }: MenuPaneProps) {
  const [chatDraft, setChatDraft] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const chatActionsRef = useRef<{
    createCurriculum: () => Promise<void>;
    resetChat: () => void;
  } | null>(null);

  async function handleCreateCurriculum() {
    if (!chatDraft.trim() || !chatActionsRef.current) return;
    setIsCreating(true);
    try {
      await chatActionsRef.current.createCurriculum();
    } finally {
      setIsCreating(false);
    }
  }

  function handleResetChat() {
    chatActionsRef.current?.resetChat();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
        <div className="shrink-0">
          <p className="text-base font-semibold text-foreground">Menu</p>
        </div>

        <AiChatWindow
          draft={chatDraft}
          onDraftChange={setChatDraft}
          onRegisterActions={(actions) => {
            chatActionsRef.current = actions;
          }}
        />

        <LessonPlannerOptions
          students={students}
          chatDraft={chatDraft}
          onCreateCurriculum={handleCreateCurriculum}
          onResetChat={handleResetChat}
          isCreating={isCreating}
        />
      </div>
  );
}
