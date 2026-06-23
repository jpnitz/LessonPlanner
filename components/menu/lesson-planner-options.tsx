"use client";

import { useState } from "react";
import type { StudentSafe } from "@/types/profile";
import { DAY_LABELS, DAY_VALUES } from "@/types/curriculum";
import { useLessonPlanner } from "@/components/lesson-planner/lesson-planner-context";
import { useMenuChat } from "@/components/menu/menu-chat-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LessonPlannerOptionsProps = {
  students: StudentSafe[];
  chatDraft: string;
  onCreateCurriculum: () => void;
  onResetChat: () => void;
  isCreating: boolean;
};

export function LessonPlannerOptions({
  students,
  chatDraft,
  onCreateCurriculum,
  onResetChat,
  isCreating,
}: LessonPlannerOptionsProps) {
  const { settings, isLoading, isSaving, saveError, updateSettings } =
    useLessonPlanner();
  const { chatMode } = useMenuChat();
  const [expanded, setExpanded] = useState(true);

  const showResetChat =
    chatMode === "standard" ||
    chatMode === "create_curriculum";

  function toggleDay(day: number) {
    const next = settings.days_of_week.includes(day)
      ? settings.days_of_week.filter((value) => value !== day)
      : [...settings.days_of_week, day].sort((a, b) => a - b);
    updateSettings({ days_of_week: next });
  }

  function toggleStudent(studentId: string) {
    const next = settings.selected_student_ids.includes(studentId)
      ? settings.selected_student_ids.filter((id) => id !== studentId)
      : [...settings.selected_student_ids, studentId];
    updateSettings({ selected_student_ids: next });
  }

  return (
    <section className="shrink-0 rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <h3 className="text-sm font-semibold text-foreground">
          Lesson Planner Options
        </h3>
        <span className="text-xs text-muted">
          {expanded ? "▲ Hide" : "▼ Show"}
          {isSaving ? " · Saving…" : ""}
        </span>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-border p-3">
          {saveError ? (
            <p className="rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
              {saveError}
            </p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted">Loading settings…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Hours / week"
                  type="number"
                  min={0}
                  step={0.5}
                  value={settings.hours_per_week ?? ""}
                  onChange={(event) =>
                    updateSettings({
                      hours_per_week:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
                <Input
                  label="Hours / day"
                  type="number"
                  min={0}
                  step={0.5}
                  value={settings.hours_per_day ?? ""}
                  onChange={(event) =>
                    updateSettings({
                      hours_per_day:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Days of week
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_VALUES.map((day, index) => {
                    const selected = settings.days_of_week.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? "border-accent bg-accent-soft text-foreground"
                            : "border-border bg-surface-muted text-muted hover:border-accent"
                        }`}
                      >
                        {DAY_LABELS[index]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {settings.days_of_week.length === 0
                    ? "Any day / open time"
                    : "Selected days only"}
                </p>
              </div>

              {students.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Students
                  </p>
                  <div className="space-y-1.5">
                    {students.map((student) => {
                      const selected = settings.selected_student_ids.includes(
                        student.id,
                      );
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
                    Selected students filter the Curriculum page. Leave all
                    unchecked to show every curriculum.
                  </p>
                </div>
              ) : null}

              {showResetChat ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onResetChat}
                  className="w-full"
                >
                  Reset chat
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!chatDraft.trim() || isCreating}
                    onClick={onCreateCurriculum}
                    className="w-full"
                  >
                    Create new curriculum
                  </Button>
                  {!chatDraft.trim() ? (
                    <p className="text-xs text-muted">
                      Describe the subject you want in the chat box above first.
                    </p>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
