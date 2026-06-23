"use client";

import { useEffect, useState } from "react";
import type { CalendarEventDisplay } from "@/types/calendar";
import type { StudentSafe } from "@/types/profile";
import {
  formatDateInputValue,
  formatTimeInputValue,
  parseLocalDateTime,
} from "@/lib/calendar/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CustomEventFormProps = {
  students: StudentSafe[];
  defaultStudentId: string | null;
  initialEvent?: CalendarEventDisplay | null;
  onCancel: () => void;
  onSaved: (event: CalendarEventDisplay) => void;
  onDeleted?: (eventId: string) => void;
};

export function CustomEventForm({
  students,
  defaultStudentId,
  initialEvent,
  onCancel,
  onSaved,
  onDeleted,
}: CustomEventFormProps) {
  const anchor = initialEvent ? new Date(initialEvent.starts_at) : new Date();
  const endAnchor = initialEvent ? new Date(initialEvent.ends_at) : new Date(anchor.getTime() + 60 * 60 * 1000);

  const [studentId, setStudentId] = useState(
    initialEvent?.student_id ?? defaultStudentId ?? students[0]?.id ?? "",
  );
  const [title, setTitle] = useState(initialEvent?.event_title ?? "");
  const [description, setDescription] = useState(
    initialEvent?.event_description ?? "",
  );
  const [dateValue, setDateValue] = useState(formatDateInputValue(anchor));
  const [startTime, setStartTime] = useState(formatTimeInputValue(anchor));
  const [endTime, setEndTime] = useState(formatTimeInputValue(endAnchor));
  const [isAllDay, setIsAllDay] = useState(initialEvent?.is_all_day ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAllDay) {
      setStartTime("00:00");
      setEndTime("23:59");
    }
  }, [isAllDay]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const startsAt = isAllDay
      ? parseLocalDateTime(dateValue, "00:00")
      : parseLocalDateTime(dateValue, startTime);
    const endsAt = isAllDay
      ? parseLocalDateTime(dateValue, "23:59")
      : parseLocalDateTime(dateValue, endTime);

    const payload = {
      student_id: studentId,
      title,
      description: description.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      is_all_day: isAllDay,
    };

    try {
      const response = await fetch(
        initialEvent
          ? `/api/calendar/events/${initialEvent.id}`
          : "/api/calendar/events",
        {
          method: initialEvent ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save event.");
      }

      onSaved(data.event as CalendarEventDisplay);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save event.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialEvent || !onDeleted) return;
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/calendar/events/${initialEvent.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete event.");
      }
      onDeleted(initialEvent.id);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete event.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-border bg-surface p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {initialEvent ? "Edit custom event" : "Add custom event"}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>

      {error ? (
        <p className="rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="custom-event-student" className="block text-sm font-medium">
          Student
        </label>
        <select
          id="custom-event-student"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.display_name}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />

      <div className="space-y-1.5">
        <label htmlFor="custom-event-description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="custom-event-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <Input
        label="Date"
        type="date"
        value={dateValue}
        onChange={(event) => setDateValue(event.target.value)}
        required
      />

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(event) => setIsAllDay(event.target.checked)}
        />
        All day
      </label>

      {!isAllDay ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />
          <Input
            label="End time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isSaving || isDeleting}>
          {isSaving ? "Saving…" : initialEvent ? "Save changes" : "Add event"}
        </Button>
        {initialEvent && onDeleted ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSaving || isDeleting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
