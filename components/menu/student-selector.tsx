"use client";

import type { StudentSafe } from "@/types/profile";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";

type StudentSelectorProps = {
  students: StudentSafe[];
};

export function StudentSelector({ students }: StudentSelectorProps) {
  const { settings, isLoading, isSaving, saveError, updateSettings } =
    useLessonPlanner();

  function toggleStudent(studentId: string) {
    const next = settings.selected_student_ids.includes(studentId)
      ? settings.selected_student_ids.filter((id) => id !== studentId)
      : [...settings.selected_student_ids, studentId];
    updateSettings({ selected_student_ids: next });
  }

  if (students.length === 0) return null;

  return (
    <section className="shrink-0 rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Students</h3>
        {isSaving ? (
          <span className="text-xs text-muted">Saving…</span>
        ) : null}
      </div>

      {saveError ? (
        <p className="mb-2 rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
          {saveError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <div className="space-y-1.5">
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
          </div>
          <p className="mt-2 text-xs text-muted">
            The main pane shows content for selected students. Leave all
            unchecked to include every student.
          </p>
        </>
      )}
    </section>
  );
}
