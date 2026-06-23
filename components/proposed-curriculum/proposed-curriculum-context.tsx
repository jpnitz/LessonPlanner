"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProposedCurriculum } from "@/types/curriculum";

type ProposedCurriculumContextValue = {
  proposedCurriculum: ProposedCurriculum | null;
  setProposedCurriculum: (curriculum: ProposedCurriculum | null) => void;
  confirmProposedCurriculum: () => void;
};

const ProposedCurriculumContext =
  createContext<ProposedCurriculumContextValue | null>(null);

export function ProposedCurriculumProvider({ children }: { children: ReactNode }) {
  const [proposedCurriculum, setProposedCurriculum] =
    useState<ProposedCurriculum | null>(null);

  const confirmProposedCurriculum = useCallback(() => {
    // Confirmation is handled by opening the main pane view; keep data in context.
  }, []);

  const value = useMemo(
    () => ({
      proposedCurriculum,
      setProposedCurriculum,
      confirmProposedCurriculum,
    }),
    [proposedCurriculum, confirmProposedCurriculum],
  );

  return (
    <ProposedCurriculumContext.Provider value={value}>
      {children}
    </ProposedCurriculumContext.Provider>
  );
}

export function useProposedCurriculum() {
  const context = useContext(ProposedCurriculumContext);
  if (!context) {
    throw new Error(
      "useProposedCurriculum must be used within ProposedCurriculumProvider",
    );
  }
  return context;
}
