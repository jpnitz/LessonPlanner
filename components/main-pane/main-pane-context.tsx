"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CalendarEventDisplay } from "@/types/calendar";

export type MainPaneView =
  | "home"
  | "chat"
  | "profile"
  | "curriculum"
  | "proposed-curriculum"
  | "proposed-lessons"
  | "lesson";

type MainPaneContextValue = {
  view: MainPaneView;
  selectedLessonEvent: CalendarEventDisplay | null;
  focusCurriculumId: string | null;
  openProfile: () => void;
  openChat: () => void;
  openCurriculum: () => void;
  openCurriculumWithId: (curriculumId: string) => void;
  openProposedCurriculum: () => void;
  openProposedLessons: () => void;
  openLesson: (event: CalendarEventDisplay) => void;
  openHome: () => void;
  clearFocusCurriculum: () => void;
};

const MainPaneContext = createContext<MainPaneContextValue | null>(null);

export function MainPaneProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<MainPaneView>("home");
  const [selectedLessonEvent, setSelectedLessonEvent] =
    useState<CalendarEventDisplay | null>(null);
  const [focusCurriculumId, setFocusCurriculumId] = useState<string | null>(
    null,
  );

  const openProfile = useCallback(() => setView("profile"), []);
  const openChat = useCallback(() => setView("chat"), []);
  const openCurriculum = useCallback(() => setView("curriculum"), []);
  const openCurriculumWithId = useCallback((curriculumId: string) => {
    setFocusCurriculumId(curriculumId);
    setView("curriculum");
  }, []);
  const clearFocusCurriculum = useCallback(() => {
    setFocusCurriculumId(null);
  }, []);
  const openProposedCurriculum = useCallback(
    () => setView("proposed-curriculum"),
    [],
  );
  const openProposedLessons = useCallback(() => setView("proposed-lessons"), []);
  const openLesson = useCallback((event: CalendarEventDisplay) => {
    setSelectedLessonEvent(event);
    setView("lesson");
  }, []);
  const openHome = useCallback(() => {
    setSelectedLessonEvent(null);
    setView("home");
  }, []);

  const value = useMemo(
    () => ({
      view,
      selectedLessonEvent,
      focusCurriculumId,
      openProfile,
      openChat,
      openCurriculum,
      openCurriculumWithId,
      openProposedCurriculum,
      openProposedLessons,
      openLesson,
      openHome,
      clearFocusCurriculum,
    }),
    [
      view,
      selectedLessonEvent,
      focusCurriculumId,
      openProfile,
      openChat,
      openCurriculum,
      openCurriculumWithId,
      openProposedCurriculum,
      openProposedLessons,
      openLesson,
      openHome,
      clearFocusCurriculum,
    ],
  );

  return (
    <MainPaneContext.Provider value={value}>{children}</MainPaneContext.Provider>
  );
}

export function useMainPane() {
  const context = useContext(MainPaneContext);
  if (!context) {
    throw new Error("useMainPane must be used within MainPaneProvider");
  }
  return context;
}
