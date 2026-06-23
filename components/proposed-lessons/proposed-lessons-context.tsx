"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProposedLessonPlan } from "@/types/lesson";

type ProposedLessonsContextValue = {
  draftPlan: ProposedLessonPlan | null;
  setDraftPlan: (plan: ProposedLessonPlan | null) => void;
  clearDraftPlan: () => void;
};

const ProposedLessonsContext = createContext<ProposedLessonsContextValue | null>(
  null,
);

export function ProposedLessonsProvider({ children }: { children: ReactNode }) {
  const [draftPlan, setDraftPlanState] = useState<ProposedLessonPlan | null>(
    null,
  );

  const setDraftPlan = useCallback((plan: ProposedLessonPlan | null) => {
    setDraftPlanState(plan);
  }, []);

  const clearDraftPlan = useCallback(() => {
    setDraftPlanState(null);
  }, []);

  const value = useMemo(
    () => ({
      draftPlan,
      setDraftPlan,
      clearDraftPlan,
    }),
    [draftPlan, setDraftPlan, clearDraftPlan],
  );

  return (
    <ProposedLessonsContext.Provider value={value}>
      {children}
    </ProposedLessonsContext.Provider>
  );
}

export function useProposedLessons() {
  const context = useContext(ProposedLessonsContext);
  if (!context) {
    throw new Error(
      "useProposedLessons must be used within ProposedLessonsProvider",
    );
  }
  return context;
}
