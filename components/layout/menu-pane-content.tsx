"use client";

import { useCurrentTopic } from "@/components/current-topic/current-topic-context";

export function MenuPaneContent() {
  const { currentTopic } = useCurrentTopic();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold text-foreground">Menu</p>
        <p className="mt-2 text-sm text-muted">
          AI chat and student tools will appear here in a later phase.
        </p>
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
              {currentTopic.curriculumTitle} · {currentTopic.sectionTitle}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No topic selected. Open Curriculum and choose a learning standard.
          </p>
        )}
      </div>
    </div>
  );
}
