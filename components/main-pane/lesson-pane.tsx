"use client";

import type { CalendarEventDisplay } from "@/types/calendar";
import { formatEventTime } from "@/lib/calendar/date-utils";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";
import { eventDisplayLabel } from "@/components/calendar/calendar-event-chip";

type LessonPaneProps = {
  event: CalendarEventDisplay;
};

export function LessonPane({ event }: LessonPaneProps) {
  const { openHome } = useMainPane();
  const title = eventDisplayLabel(event);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Lesson
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">{title}</h2>
          {event.curriculum_title ? (
            <p className="mt-1 text-sm text-muted">{event.curriculum_title}</p>
          ) : null}
          {event.standard_title ? (
            <p className="text-sm text-muted">Standard: {event.standard_title}</p>
          ) : null}
        </div>
        <Button variant="secondary" size="sm" onClick={openHome}>
          Back
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-muted">Student</dt>
            <dd className="mt-1">{event.student_display_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted">When</dt>
            <dd className="mt-1">
              {new Date(event.starts_at).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              · {formatEventTime(event.starts_at, event.ends_at, event.is_all_day)}
            </dd>
          </div>
          {event.lesson_summary ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-muted">Summary</dt>
              <dd className="mt-1 text-muted">{event.lesson_summary}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <article className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-foreground">Lesson content</h3>
        {event.lesson_content ? (
          <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-sm leading-7 text-foreground">
            {event.lesson_content}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No lesson content yet. Phase 6 will generate full lesson plans from KSAs.
          </p>
        )}
      </article>
    </div>
  );
}
