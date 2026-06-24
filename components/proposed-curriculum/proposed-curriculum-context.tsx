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
  proposedCurriculumError: string | null;
  setProposedCurriculum: (curriculum: ProposedCurriculum | null) => void;
  setProposedCurriculumError: (error: string | null) => void;
  confirmProposedCurriculum: () => void;
  clearProposedCurriculum: () => void;
};

const ProposedCurriculumContext =
  createContext<ProposedCurriculumContextValue | null>(null);

export function ProposedCurriculumProvider({ children }: { children: ReactNode }) {
  const [proposedCurriculum, setProposedCurriculumState] =
    useState<ProposedCurriculum | null>(null);
  const [proposedCurriculumError, setProposedCurriculumError] = useState<
    string | null
  >(null);

  const setProposedCurriculum = useCallback(
    (curriculum: ProposedCurriculum | null) => {
      setProposedCurriculumState(curriculum);
      if (curriculum) {
        setProposedCurriculumError(null);
      }
    },
    [],
  );

  const clearProposedCurriculum = useCallback(() => {
    setProposedCurriculumState(null);
    setProposedCurriculumError(null);
  }, []);

  const confirmProposedCurriculum = useCallback(() => {
    // Confirmation is handled by opening the main pane view; keep data in context.
  }, []);

  const value = useMemo(
    () => ({
      proposedCurriculum,
      proposedCurriculumError,
      setProposedCurriculum,
      setProposedCurriculumError,
      confirmProposedCurriculum,
      clearProposedCurriculum,
    }),
    [
      proposedCurriculum,
      proposedCurriculumError,
      setProposedCurriculum,
      confirmProposedCurriculum,
      clearProposedCurriculum,
    ],
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
