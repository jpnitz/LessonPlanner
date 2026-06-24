"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEventDisplay, CalendarViewMode } from "@/types/calendar";
import type { StudentSafe } from "@/types/profile";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import {
  addDays,
  addMonths,
  formatDayHeading,
  formatMonthYear,
  formatWeekRange,
  getMonthGridDays,
  getViewRange,
  getWeekDays,
  isSameDay,
  startOfMonth,
  weekdayLabel,
} from "@/lib/calendar/date-utils";
import { Button } from "@/components/ui/button";
import {
  CalendarEventChip,
  eventsForDay,
} from "@/components/calendar/calendar-event-chip";
import { CustomEventForm } from "@/components/calendar/custom-event-form";
import { GoogleCalendarStub } from "@/components/calendar/google-calendar-stub";
import { CALENDAR_REFRESH_EVENT } from "@/lib/ui/app-events";

type CalendarPaneProps = {
  students: StudentSafe[];
  initialEvents: CalendarEventDisplay[];
  isStudentAccount: boolean;
};

type FormMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; event: CalendarEventDisplay };

export function CalendarPane({
  students,
  initialEvents,
  isStudentAccount,
}: CalendarPaneProps) {
  const { settings } = useLessonPlanner();
  const { openLesson } = useMainPane();
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [events, setEvents] = useState(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>({ kind: "closed" });

  const visibleStudentIds = useMemo(() => {
    const selected = settings.selected_student_ids.filter((id) =>
      students.some((student) => student.id === id),
    );
    if (selected.length > 0) return selected;
    return students.map((student) => student.id);
  }, [settings.selected_student_ids, students]);

  const defaultStudentId = visibleStudentIds[0] ?? students[0]?.id ?? null;
  const range = useMemo(
    () => getViewRange(viewMode, anchorDate),
    [anchorDate, viewMode],
  );

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const params = new URLSearchParams({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    });
    for (const studentId of visibleStudentIds) {
      params.append("studentId", studentId);
    }

    try {
      const response = await fetch(`/api/calendar/events?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not load calendar events. Run migration 005 in Supabase if you have not yet.",
        );
      }
      setEvents(data.events as CalendarEventDisplay[]);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load calendar events.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [range.end, range.start, visibleStudentIds]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    const handleRefresh = () => {
      void refreshEvents();
    };

    window.addEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(CALENDAR_REFRESH_EVENT, handleRefresh);
  }, [refreshEvents]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleSelectEvent(event: CalendarEventDisplay) {
    if (event.event_type === "lesson") {
      openLesson(event);
      return;
    }
    if (!isStudentAccount) {
      setFormMode({ kind: "edit", event });
    }
  }

  function handleSavedEvent(event: CalendarEventDisplay) {
    setEvents((current) => {
      const without = current.filter((item) => item.id !== event.id);
      return [...without, event].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    });
    setFormMode({ kind: "closed" });
  }

  function handleDeletedEvent(eventId: string) {
    setEvents((current) => current.filter((item) => item.id !== eventId));
    setFormMode({ kind: "closed" });
  }

  function shiftAnchor(direction: -1 | 1) {
    if (viewMode === "month") {
      setAnchorDate((current) => addMonths(current, direction));
      return;
    }
    if (viewMode === "week") {
      setAnchorDate((current) => addDays(current, direction * 7));
      return;
    }
    setAnchorDate((current) => addDays(current, direction));
  }

  const heading =
    viewMode === "month"
      ? formatMonthYear(anchorDate)
      : viewMode === "week"
        ? formatWeekRange(range.start, range.end)
        : formatDayHeading(anchorDate);

  if (!mounted) {
    return (
      <div className="space-y-3">
        <p className="text-base font-semibold text-foreground">Calendar</p>
        <p className="text-sm text-muted">Loading calendar…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-foreground">Calendar</p>
          <p className="text-xs text-muted">{heading}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(["month", "week", "day"] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={viewMode === mode ? "primary" : "secondary"}
              onClick={() => setViewMode(mode)}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => shiftAnchor(-1)}>
          ‹ Prev
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAnchorDate(new Date())}>
          Today
        </Button>
        <Button size="sm" variant="secondary" onClick={() => shiftAnchor(1)}>
          Next ›
        </Button>
        {!isStudentAccount ? (
          <Button
            size="sm"
            onClick={() =>
              setFormMode((current) =>
                current.kind === "create" ? { kind: "closed" } : { kind: "create" },
              )
            }
          >
            {formMode.kind === "create" ? "Cancel add" : "+ Custom event"}
          </Button>
        ) : null}
        {isLoading ? <span className="text-xs text-muted">Loading…</span> : null}
      </div>

      {loadError ? (
        <p className="rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
          {loadError}
        </p>
      ) : null}

      {formMode.kind === "create" ? (
        <CustomEventForm
          students={students.filter((student) =>
            visibleStudentIds.includes(student.id),
          )}
          defaultStudentId={defaultStudentId}
          onCancel={() => setFormMode({ kind: "closed" })}
          onSaved={handleSavedEvent}
        />
      ) : null}

      {formMode.kind === "edit" ? (
        <CustomEventForm
          students={students.filter((student) =>
            visibleStudentIds.includes(student.id),
          )}
          defaultStudentId={defaultStudentId}
          initialEvent={formMode.event}
          onCancel={() => setFormMode({ kind: "closed" })}
          onSaved={handleSavedEvent}
          onDeleted={handleDeletedEvent}
        />
      ) : null}

      {viewMode === "month" ? (
        <MonthView
          anchorDate={anchorDate}
          events={events}
          onSelectEvent={handleSelectEvent}
        />
      ) : null}

      {viewMode === "week" ? (
        <WeekView
          anchorDate={anchorDate}
          events={events}
          onSelectEvent={handleSelectEvent}
        />
      ) : null}

      {viewMode === "day" ? (
        <DayView
          anchorDate={anchorDate}
          events={events}
          onSelectEvent={handleSelectEvent}
        />
      ) : null}

      <GoogleCalendarStub />
    </div>
  );
}

function MonthView({
  anchorDate,
  events,
  onSelectEvent,
}: {
  anchorDate: Date;
  events: CalendarEventDisplay[];
  onSelectEvent: (event: CalendarEventDisplay) => void;
}) {
  const days = getMonthGridDays(anchorDate);
  const monthIndex = startOfMonth(anchorDate).getMonth();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] grid grid-cols-7 gap-1">
        {days.slice(0, 7).map((day) => (
          <div
            key={`head-${day.getDay()}`}
            className="px-1 text-center text-[11px] font-semibold uppercase text-muted"
          >
            {weekdayLabel(day)}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const inMonth = day.getMonth() === monthIndex;
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-20 rounded border p-1 ${
                inMonth ? "border-border bg-surface" : "border-transparent bg-surface-muted/40"
              } ${isToday ? "ring-1 ring-accent/40" : ""}`}
            >
              <p
                className={`mb-1 text-[11px] font-medium ${
                  inMonth ? "text-foreground" : "text-muted"
                }`}
              >
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEventChip
                    key={event.id}
                    event={event}
                    compact
                    onSelect={onSelectEvent}
                  />
                ))}
                {dayEvents.length > 3 ? (
                  <p className="text-[10px] text-muted">+{dayEvents.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  anchorDate,
  events,
  onSelectEvent,
}: {
  anchorDate: Date;
  events: CalendarEventDisplay[];
  onSelectEvent: (event: CalendarEventDisplay) => void;
}) {
  const days = getWeekDays(anchorDate);

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((day) => {
        const dayEvents = eventsForDay(events, day);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={day.toISOString()}
            className={`rounded-md border p-2 ${
              isToday ? "border-accent/40 bg-accent-soft/20" : "border-border bg-surface"
            }`}
          >
            <p className="mb-2 text-xs font-semibold text-foreground">
              {weekdayLabel(day)} {day.getDate()}
            </p>
            <div className="space-y-1">
              {dayEvents.length === 0 ? (
                <p className="text-[11px] text-muted">No events</p>
              ) : (
                dayEvents.map((event) => (
                  <CalendarEventChip
                    key={event.id}
                    event={event}
                    onSelect={onSelectEvent}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  anchorDate,
  events,
  onSelectEvent,
}: {
  anchorDate: Date;
  events: CalendarEventDisplay[];
  onSelectEvent: (event: CalendarEventDisplay) => void;
}) {
  const dayEvents = eventsForDay(events, anchorDate);

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      {dayEvents.length === 0 ? (
        <p className="text-sm text-muted">No events scheduled for this day.</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((event) => (
            <CalendarEventChip
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
