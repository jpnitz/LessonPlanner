"use client";

import { useCallback, useState } from "react";
import type { ProposedCurriculum } from "@/types/curriculum";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useMenuChat } from "@/components/menu/menu-chat-context";
import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";

type ApiChatResponse = {
  message?: string;
  proposedCurriculum?: ProposedCurriculum | null;
  proposedCurriculumError?: string | null;
  error?: string;
};

type TopicContext = {
  standardTitle: string;
  domainTitle?: string | null;
  curriculumTitle?: string | null;
  studentId?: string | null;
};

type UseAiChatControllerOptions = {
  onAfterSend?: () => void;
  topicOverride?: TopicContext | null;
};

export function useAiChatController(options: UseAiChatControllerOptions = {}) {
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
  const { clearTopic } = useCurrentTopic();
  const topicOverride = options.topicOverride;

  const resolvedTopic =
    topicOverride ??
    (currentTopic
      ? {
          standardTitle: currentTopic.standardTitle,
          domainTitle: currentTopic.domainTitle,
          curriculumTitle: currentTopic.curriculumTitle,
          studentId: currentTopic.studentId,
        }
      : null);

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKeyHelp, setMissingKeyHelp] = useState<string | null>(null);
  const [pendingProposal, setPendingProposal] =
    useState<ProposedCurriculum | null>(null);

  const handleResetChat = useCallback(() => {
    resetChat();
    setPendingProposal(null);
    clearProposedCurriculum();
    setError(null);
    setMissingKeyHelp(null);
    void clearTopic();
  }, [resetChat, clearProposedCurriculum, clearTopic]);

  const sendChat = useCallback(
    async (
      mode: "chat" | "test_knowledge" | "create_curriculum",
      draft: string,
      onDraftConsumed?: () => void,
      onDraftRestore?: (value: string) => void,
    ) => {
      const trimmed = draft.trim();
      const nextMessages =
        trimmed && mode !== "test_knowledge"
          ? [...messages, { role: "user" as const, content: trimmed }]
          : messages;

      if (mode === "test_knowledge" && !resolvedTopic) {
        setError("Select a learning standard or lesson first.");
        return;
      }

      if (mode === "create_curriculum" && !trimmed) return;

      if (mode !== "test_knowledge") {
        const userCount = nextMessages.filter((message) => message.role === "user").length;
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
      if (trimmed && mode !== "test_knowledge") onDraftConsumed?.();

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
              settings.selected_student_ids[0] ??
              resolvedTopic?.studentId ??
              currentTopic?.studentId ??
              null,
            currentTopic:
              mode !== "create_curriculum" && resolvedTopic
                ? {
                    standardTitle: resolvedTopic.standardTitle,
                    domainTitle: resolvedTopic.domainTitle,
                    curriculumTitle: resolvedTopic.curriculumTitle,
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
          if (trimmed) onDraftRestore?.(trimmed);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? data.message ?? "Chat request failed.");
        }

        setMessages([
          ...outboundMessages,
          { role: "assistant", content: data.message ?? "" },
        ]);

        options.onAfterSend?.();

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
        if (trimmed) onDraftRestore?.(trimmed);
      } finally {
        setIsSending(false);
      }
    },
    [
      messages,
      resolvedTopic,
      currentTopic,
      settings.selected_student_ids,
      setMessages,
      markCreateCurriculum,
      markStandardChat,
      options,
      setProposedCurriculum,
      setProposedCurriculumError,
    ],
  );

  function confirmPendingProposal() {
    if (!pendingProposal) return;
    setProposedCurriculum(pendingProposal);
    setPendingProposal(null);
  }

  return {
    messages,
    chatMode,
    isSending,
    error,
    missingKeyHelp,
    pendingProposal,
    proposedCurriculumError,
    sendChat,
    handleResetChat,
    confirmPendingProposal,
  };
}
