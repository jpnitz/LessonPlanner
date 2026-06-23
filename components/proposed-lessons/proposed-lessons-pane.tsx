"use client";

import { useState } from "react";
import type { ProposedLessonPlan } from "@/types/lesson";
import { ACTIVITY_TYPE_LABELS } from "@/types/lesson";
import { formatEventTime } from "@/lib/calendar/date-utils";
import { useProposedLessons } from "@/components/proposed-lessons/proposed-lessons-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";

export function ProposedLessonsPane() {
  const { draftPlan, clearDraftPlan } = useProposedLessons();
  const { openHome, openLesson } = useMainPane();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  if (!draftPlan || draftPlan.lessons.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        No draft lesson plans to review. Generate lessons from a confirmed standard
        in Curriculum or from a proposed curriculum.
      </div>
    );
  }

  async function handleSave() {
    if (!draftPlan) return;

    setIsSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const lessonCount = draftPlan.lessons.length;
      const response = await fetch("/api/lessons/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPlan),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not save lessons. Run migration 006 in Supabase if you have not yet.",
        );
      }

      clearDraftPlan();
      setSavedMessage(
        `Saved ${data.events?.length ?? lessonCount} lesson(s) to the calendar.`,
      );

      const firstEvent = data.events?.[0];
      if (firstEvent) {
        openLesson(firstEvent);
      } else {
        openHome();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save lessons.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Review lesson plans
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          AI-generated draft lessons based on your confirmed standards. Review
          activities and scheduled times, then save to add them to the calendar.
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {savedMessage ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-foreground">
          {savedMessage}
        </p>
      ) : null}

      <div className="space-y-4">
        {draftPlan.lessons.map((lesson) => (
          <section
            key={lesson.client_id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {lesson.title}
                </h3>
                {lesson.curriculum_title ? (
                  <p className="mt-1 text-xs text-muted">{lesson.curriculum_title}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted">
                  Standard: {lesson.standard_title}
                </p>
              </div>
              {lesson.scheduled_starts_at && lesson.scheduled_ends_at ? (
                <p className="rounded-md bg-accent-soft px-2 py-1 text-xs text-foreground">
                  {new Date(lesson.scheduled_starts_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ·{" "}
                  {formatEventTime(
                    lesson.scheduled_starts_at,
                    lesson.scheduled_ends_at,
                    false,
                  )}
                </p>
              ) : null}
            </div>

            {lesson.summary ? (
              <p className="mt-3 text-sm text-muted">{lesson.summary}</p>
            ) : null}

            <ul className="mt-4 space-y-2">
              {lesson.activities.map((activity, index) => (
                <li
                  key={`${lesson.client_id}-${index}`}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium text-accent">
                    {ACTIVITY_TYPE_LABELS[activity.activity_type]}:
                  </span>{" "}
                  {activity.title}
                  {activity.duration_minutes ? (
                    <span className="text-xs text-muted">
                      {" "}
                      · {activity.duration_minutes} min
                    </span>
                  ) : null}
                  {activity.description ? (
                    <p className="mt-1 text-xs text-muted">{activity.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>

            {lesson.content ? (
              <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm whitespace-pre-wrap leading-7 text-foreground">
                {lesson.content}
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? "Saving…" : "Save & schedule on calendar"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSaving}
          onClick={() => {
            clearDraftPlan();
            openHome();
          }}
        >
          Discard draft
        </Button>
      </div>
    </div>
  );
}
