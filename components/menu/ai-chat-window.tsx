"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProposedCurriculum } from "@/types/curriculum";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useMenuChat } from "@/components/menu/menu-chat-context";
import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";

type AiChatWindowProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onRegisterActions?: (actions: {
    createCurriculum: () => Promise<void>;
    resetChat: () => void;
  }) => void;
};

type ApiChatResponse = {
  message?: string;
  proposedCurriculum?: ProposedCurriculum | null;
  proposedCurriculumError?: string | null;
  error?: string;
};

export function AiChatWindow({
  draft,
  onDraftChange,
  onRegisterActions,
}: AiChatWindowProps) {
  const { currentTopic } = useCurrentTopic();
  const { settings } = useLessonPlanner();
  const {
    messages,
    setMessages,
    markStandardChat,
    markCreateCurriculum,
    resetChat,
    chatMode,
  } = useMenuChat();
  const {
    setProposedCurriculum,
    setProposedCurriculumError,
    clearProposedCurriculum,
    proposedCurriculumError,
  } = useProposedCurriculum();
  const { openChat } = useMainPane();
  const { clearTopic } = useCurrentTopic();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKeyHelp, setMissingKeyHelp] = useState<string | null>(null);
  const [pendingProposal, setPendingProposal] =
    useState<ProposedCurriculum | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleResetChat = useCallback(() => {
    resetChat();
    setPendingProposal(null);
    clearProposedCurriculum();
    setError(null);
    setMissingKeyHelp(null);
    onDraftChange("");
    void clearTopic();
  }, [resetChat, onDraftChange, clearProposedCurriculum, clearTopic]);

  const sendChat = useCallback(
    async (mode: "chat" | "test_knowledge" | "create_curriculum") => {
      const trimmed = draftRef.current.trim();
      const nextMessages =
        trimmed && mode !== "test_knowledge"
          ? [...messages, { role: "user" as const, content: trimmed }]
          : messages;

      if (mode === "test_knowledge" && !currentTopic) {
        setError("Select a learning standard in Curriculum first.");
        return;
      }

      if (mode === "create_curriculum" && !trimmed) return;

      if (mode !== "test_knowledge") {
        const userCount = nextMessages.filter((m) => m.role === "user").length;
        if (userCount === 0) return;
      }

      if (mode === "create_curriculum") {
        markCreateCurriculum();
      } else if (mode === "chat" || mode === "test_knowledge") {
        markStandardChat();
      }

      setIsSending(true);
      setError(null);
      setMissingKeyHelp(null);
      if (trimmed && mode !== "test_knowledge") onDraftChange("");

      const outboundMessages =
        mode === "test_knowledge"
          ? [
              ...messages,
              {
                role: "user" as const,
                content:
                  "Please quiz me on the current topic. Ask one question at a time.",
              },
            ]
          : nextMessages;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            messages: outboundMessages,
            studentId:
              settings.selected_student_ids[0] ?? currentTopic?.studentId ?? null,
            currentTopic:
              mode !== "create_curriculum" && currentTopic
                ? {
                    standardTitle: currentTopic.standardTitle,
                    domainTitle: currentTopic.domainTitle,
                    curriculumTitle: currentTopic.curriculumTitle,
                  }
                : undefined,
          }),
        });

        const data = (await response.json()) as ApiChatResponse;

        if (response.status === 422 && data.error === "missing_api_key") {
          setMissingKeyHelp(
            data.message ??
              "Add OPENAI_API_KEY to .env.local, or add a per-student key in Profile.",
          );
          if (trimmed) onDraftChange(trimmed);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? data.message ?? "Chat request failed.");
        }

        setMessages([
          ...outboundMessages,
          { role: "assistant", content: data.message ?? "" },
        ]);

        openChat();

        if (data.proposedCurriculum) {
          setPendingProposal(data.proposedCurriculum);
          setProposedCurriculum(data.proposedCurriculum);
        } else if (data.proposedCurriculumError) {
          setPendingProposal(null);
          setProposedCurriculumError(data.proposedCurriculumError);
        }
      } catch (sendError) {
        setError(
          sendError instanceof Error ? sendError.message : "Chat request failed.",
        );
        if (trimmed) onDraftChange(trimmed);
      } finally {
        setIsSending(false);
      }
    },
    [
      messages,
      currentTopic,
      settings.selected_student_ids,
      onDraftChange,
      setMessages,
      markCreateCurriculum,
      markStandardChat,
      openChat,
      setProposedCurriculum,
      setProposedCurriculumError,
    ],
  );

  useEffect(() => {
    onRegisterActions?.({
      createCurriculum: () => sendChat("create_curriculum"),
      resetChat: handleResetChat,
    });
  }, [onRegisterActions, sendChat, handleResetChat]);

  function handleConfirmProposal() {
    if (!pendingProposal) return;
    setProposedCurriculum(pendingProposal);
    setPendingProposal(null);
    openChat();
  }

  const placeholder = currentTopic
    ? `Discuss: ${currentTopic.standardTitle}`
    : chatMode === "create_curriculum"
      ? "Answer the assistant's questions about the new curriculum…"
      : "Describe a topic, ask a question, or say what you want to learn…";

  const sendMode: "chat" | "create_curriculum" =
    chatMode === "create_curriculum" ? "create_curriculum" : "chat";

  return (
    <section className="flex shrink-0 flex-col rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">AI chat</h3>
      </div>

      <div
        ref={scrollRef}
        className="max-h-48 min-h-[6rem] space-y-2 overflow-y-auto p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            {currentTopic
              ? `Selected standard: ${currentTopic.standardTitle}`
              : "Start a conversation or select a standard in Curriculum."}
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-md px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-6 bg-accent-soft text-foreground"
                  : "mr-6 bg-surface-muted text-foreground"
              }`}
            >
              {message.content}
            </div>
          ))
        )}
        {isSending ? (
          <p className="text-xs text-muted">Assistant is thinking…</p>
        ) : null}
      </div>

      {proposedCurriculumError ? (
        <div className="border-t border-border bg-danger-soft p-3 text-sm text-danger">
          {proposedCurriculumError}
        </div>
      ) : null}

      {pendingProposal ? (
        <div className="border-t border-border bg-accent-soft/40 p-3 text-sm">
          <p className="font-medium text-foreground">
            Proposed curriculum: {pendingProposal.title}
          </p>
          <p className="mt-1 text-muted">
            {(pendingProposal.standards ?? []).length} standard
            {(pendingProposal.standards ?? []).length === 1 ? "" : "s"} ready to
            review.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            onClick={handleConfirmProposal}
          >
            Confirm and review in main pane
          </Button>
        </div>
      ) : null}

      {missingKeyHelp ? (
        <div className="border-t border-border bg-danger-soft p-3 text-sm text-danger">
          {missingKeyHelp}
        </div>
      ) : null}

      {error ? (
        <div className="border-t border-border px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border p-3">
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSending || !draft.trim()}
            onClick={() => sendChat(sendMode)}
          >
            {sendMode === "create_curriculum" ? "Send reply" : "Send"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isSending || !currentTopic}
            onClick={() => sendChat("test_knowledge")}
          >
            Test my knowledge
          </Button>
        </div>
      </div>
    </section>
  );
}
