"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MainPaneView = "home" | "profile" | "curriculum" | "proposed-curriculum";

type MainPaneContextValue = {
  view: MainPaneView;
  openProfile: () => void;
  openCurriculum: () => void;
  openProposedCurriculum: () => void;
  openHome: () => void;
};

const MainPaneContext = createContext<MainPaneContextValue | null>(null);

export function MainPaneProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<MainPaneView>("home");

  const openProfile = useCallback(() => setView("profile"), []);
  const openCurriculum = useCallback(() => setView("curriculum"), []);
  const openProposedCurriculum = useCallback(
    () => setView("proposed-curriculum"),
    [],
  );
  const openHome = useCallback(() => setView("home"), []);

  const value = useMemo(
    () => ({
      view,
      openProfile,
      openCurriculum,
      openProposedCurriculum,
      openHome,
    }),
    [view, openProfile, openCurriculum, openProposedCurriculum, openHome],
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
