"use client";

import { useMemo, useState } from "react";
import type { StudentSafe } from "@/types/profile";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";

type StudentSelectorProps = {
  students: StudentSafe[];
};

export function StudentSelector({ students }: StudentSelectorProps) {
  const { settings, isLoading, isSaving, saveError, updateSettings } =
    useLessonPlanner();
  const [expanded, setExpanded] = useState(true);

  function toggleStudent(studentId: string) {
    const next = settings.selected_student_ids.includes(studentId)
      ? settings.selected_student_ids.filter((id) => id !== studentId)
      : [...settings.selected_student_ids, studentId];
    updateSettings({ selected_student_ids: next });
  }

  const selectedLabel = useMemo(() => {
    const selected = students.filter((student) =>
      settings.selected_student_ids.includes(student.id),
    );

    if (selected.length === 0) {
      return "All students";
    }

    return selected
      .map((student) => student.display_name)
      .join(", ");
  }, [settings.selected_student_ids, students]);

  if (students.length === 0) return null;

  return (
    <section className="shrink-0 rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <h3 className="truncate text-sm font-semibold text-foreground">
          {selectedLabel}
        </h3>
        <span className="shrink-0 text-xs text-muted">
          {expanded ? "▲ Hide" : "▼ Show"}
          {isSaving ? " · Saving…" : ""}
        </span>
      </button>

      {expanded ? (
        <div className="space-y-1.5 border-t border-border p-3">
          {saveError ? (
            <p className="rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
              {saveError}
            </p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <>
              {students.map((student) => {
                const selected = settings.selected_student_ids.includes(student.id);
                return (
                  <label
                    key={student.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleStudent(student.id)}
                    />
                    <span className="text-foreground">
                      {student.display_name}
                      {student.is_primary ? " (primary)" : ""}
                    </span>
                  </label>
                );
              })}
              <p className="pt-1 text-xs text-muted">
                The main pane shows content for selected students. Leave all
                unchecked to include every student.
              </p>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
