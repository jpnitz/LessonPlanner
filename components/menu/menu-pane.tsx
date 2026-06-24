"use client";

import type { StudentSafe } from "@/types/profile";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { LessonPlannerOptions } from "@/components/menu/lesson-planner-options";
import { MenuNavLinks } from "@/components/menu/menu-nav-links";
import { MenuAiChat } from "@/components/menu/menu-ai-chat";
import { StudentSelector } from "@/components/menu/student-selector";

type MenuPaneProps = {
  students: StudentSafe[];
};

export function MenuPane({ students }: MenuPaneProps) {
  const { view, selectedLessonEvent } = useMainPane();

  if (view === "home" || view === "profile") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
        <div className="shrink-0">
          <p className="text-base font-semibold text-foreground">Menu</p>
        </div>
        <LessonPlannerOptions students={students} />
        <MenuNavLinks />
      </div>
    );
  }

  if (view === "curriculum") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden pr-1">
        <StudentSelector students={students} />
        <MenuAiChat variant="curriculum" />
        <MenuNavLinks />
      </div>
    );
  }

  if (view === "lessons" || view === "proposed-lessons") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden pr-1">
        <StudentSelector students={students} />
        <MenuAiChat
          variant="lessons"
          selectedLessonEvent={selectedLessonEvent}
        />
        <MenuNavLinks />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      <LessonPlannerOptions students={students} />
      <MenuNavLinks />
    </div>
  );
}
