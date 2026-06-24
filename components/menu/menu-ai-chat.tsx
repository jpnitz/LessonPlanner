"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEventDisplay } from "@/types/calendar";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { useAiChatController } from "@/components/menu/use-ai-chat-controller";
import { Button } from "@/components/ui/button";

type MenuAiChatProps = {
  variant: "curriculum" | "lessons";
  selectedLessonEvent?: CalendarEventDisplay | null;
};

export function MenuAiChat({ variant, selectedLessonEvent }: MenuAiChatProps) {
  const { currentTopic } = useCurrentTopic();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const topicOverride = useMemo(() => {
    if (variant !== "lessons" || !selectedLessonEvent?.standard_title) {
      return null;
    }

    return {
      standardTitle: selectedLessonEvent.standard_title,
      domainTitle: null,
      curriculumTitle: selectedLessonEvent.curriculum_title ?? null,
      studentId: selectedLessonEvent.student_id ?? null,
    };
  }, [selectedLessonEvent, variant]);

  const {
    messages,
    isSending,
    error,
    missingKeyHelp,
    sendChat,
  } = useAiChatController({ topicOverride });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const focusLabel = topicOverride?.standardTitle ?? currentTopic?.standardTitle;

  const placeholder =
    variant === "lessons"
      ? selectedLessonEvent
        ? `Ask about this lesson or its standard: ${selectedLessonEvent.standard_title ?? selectedLessonEvent.curriculum_title ?? "selected lesson"}`
        : "Select a lesson from the calendar to discuss it here…"
      : focusLabel
        ? `Discuss: ${focusLabel}`
        : "Select a subject, standard, or KSA in the main pane to focus this chat…";

  const emptyHint =
    variant === "lessons"
      ? selectedLessonEvent
        ? `Focused on lesson: ${selectedLessonEvent.standard_title ?? selectedLessonEvent.curriculum_title ?? "selected lesson"}`
        : "Pick a lesson from the calendar above."
      : focusLabel
        ? `Focused on: ${focusLabel}`
        : "Select a subject, standard, or KSA in the main pane.";

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">AI chat</h3>
        {focusLabel ? (
          <p className="mt-0.5 text-xs text-muted">Topic: {focusLabel}</p>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="min-h-[6rem] resize-y overflow-y-auto space-y-2 border-b border-border p-3"
        style={{ height: "12rem", maxHeight: "50vh" }}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted">{emptyHint}</p>
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

      <div className="shrink-0 space-y-2 border-t border-border p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSending || !draft.trim()}
            onClick={() =>
              sendChat(
                "chat",
                draft,
                () => setDraft(""),
                (value) => setDraft(value),
              )
            }
          >
            Send
          </Button>
          {variant === "lessons" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSending || !focusLabel}
              onClick={() =>
                sendChat(
                  "test_knowledge",
                  draft,
                  () => setDraft(""),
                  (value) => setDraft(value),
                )
              }
            >
              Test my knowledge
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
