"use client";

import { useMainPane } from "@/components/main-pane/main-pane-context";

export function MenuNavLinks() {
  const { openCurriculum, openLessons } = useMainPane();

  return (
    <nav className="shrink-0 space-y-1 rounded-lg border border-border bg-surface p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Go to
      </p>
      <button
        type="button"
        onClick={openCurriculum}
        className="block w-full rounded-md px-2 py-2 text-left text-sm font-medium text-accent hover:bg-accent-soft hover:text-accent-hover"
      >
        See Your Curriculum
      </button>
      <button
        type="button"
        onClick={openLessons}
        className="block w-full rounded-md px-2 py-2 text-left text-sm font-medium text-accent hover:bg-accent-soft hover:text-accent-hover"
      >
        See Your Lessons/Calendar
      </button>
    </nav>
  );
}
