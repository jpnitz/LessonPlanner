"use client";

import { useEffect, useState } from "react";
import type { CalendarEventDisplay } from "@/types/calendar";
import type { LessonActivity } from "@/types/lesson";
import { ACTIVITY_TYPE_LABELS } from "@/types/lesson";
import { formatEventTime, DATE_LOCALE } from "@/lib/calendar/date-utils";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";
import { eventDisplayLabel } from "@/components/calendar/calendar-event-chip";

type LessonPaneProps = {
  event: CalendarEventDisplay;
};

export function LessonPane({ event }: LessonPaneProps) {
  const { openHome } = useMainPane();
  const title = eventDisplayLabel(event);
  const [activities, setActivities] = useState<LessonActivity[]>([]);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  useEffect(() => {
    if (!event.lesson_id) {
      setActivities([]);
      return;
    }

    let cancelled = false;

    async function loadActivities() {
      try {
        const response = await fetch(`/api/lessons/${event.lesson_id}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load lesson activities.");
        }
        if (!cancelled) {
          setActivities((data.activities ?? []) as LessonActivity[]);
          setActivitiesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setActivities([]);
          setActivitiesError(
            error instanceof Error ? error.message : "Could not load activities.",
          );
        }
      }
    }

    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, [event.lesson_id]);

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
              {new Date(event.starts_at).toLocaleString(DATE_LOCALE, {
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

      {activities.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-foreground">Activities</h3>
          <ul className="mt-3 space-y-2">
            {activities.map((activity) => (
              <li
                key={activity.id}
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
                {activity.resources?.url ? (
                  <p className="mt-1 text-xs">
                    <a
                      href={activity.resources.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-accent-hover"
                    >
                      Open resource
                    </a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activitiesError ? (
        <p className="text-xs text-muted">{activitiesError}</p>
      ) : null}

      <article className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-foreground">Lesson overview</h3>
        {event.lesson_content ? (
          <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-sm leading-7 text-foreground">
            {event.lesson_content}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No lesson overview available.</p>
        )}
      </article>
    </div>
  );
}
