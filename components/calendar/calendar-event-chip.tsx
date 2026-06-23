"use client";

import type { CalendarEventDisplay } from "@/types/calendar";
import {
  formatEventTime,
  isSameDay,
} from "@/lib/calendar/date-utils";

type CalendarEventChipProps = {
  event: CalendarEventDisplay;
  compact?: boolean;
  onSelect: (event: CalendarEventDisplay) => void;
};

export function CalendarEventChip({
  event,
  compact = false,
  onSelect,
}: CalendarEventChipProps) {
  const isLesson = event.event_type === "lesson";
  const title = isLesson
    ? event.lesson_title ?? event.event_title
    : event.event_title;
  const subtitle = isLesson ? event.curriculum_title : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={`w-full rounded border px-2 py-1 text-left transition-colors hover:brightness-95 ${
        isLesson
          ? "border-accent/30 bg-accent-soft text-foreground"
          : "border-border bg-surface-muted text-foreground"
      }`}
      title={
        subtitle
          ? `${title} · ${subtitle}`
          : event.event_description ?? title
      }
    >
      <p className={`truncate font-medium ${compact ? "text-[11px]" : "text-xs"}`}>
        {title}
      </p>
      {!compact && subtitle ? (
        <p className="truncate text-[11px] text-muted">{subtitle}</p>
      ) : null}
      {!compact ? (
        <p className="truncate text-[11px] text-muted">
          {formatEventTime(event.starts_at, event.ends_at, event.is_all_day)}
        </p>
      ) : null}
    </button>
  );
}

export function eventsForDay(events: CalendarEventDisplay[], day: Date) {
  return events.filter((event) => isSameDay(new Date(event.starts_at), day));
}

export function eventDisplayLabel(event: CalendarEventDisplay) {
  if (event.event_type === "lesson") {
    return event.lesson_title ?? event.event_title;
  }
  return event.event_title;
}
